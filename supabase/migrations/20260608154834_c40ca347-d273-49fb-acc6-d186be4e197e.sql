
-- 1. Add visibility & kyc status columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS visibility_status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS visibility_until timestamptz;

-- Backfill KYC status from existing submissions
UPDATE public.profiles p
SET kyc_status = CASE k.status
  WHEN 'approved' THEN 'valid'
  WHEN 'rejected' THEN 'rejected'
  WHEN 'pending' THEN 'pending'
  ELSE 'none' END
FROM public.kyc_submissions k
WHERE k.user_id = p.id;

-- Backfill visibility from is_published
UPDATE public.profiles
SET visibility_status = CASE WHEN is_published AND published_until IS NOT NULL AND published_until > now() THEN 'active' ELSE 'inactive' END,
    visibility_until = published_until;

-- 2. Trigger to keep profile.kyc_status in sync with kyc_submissions
CREATE OR REPLACE FUNCTION public.sync_profile_kyc_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s text;
BEGIN
  _s := CASE NEW.status
    WHEN 'approved' THEN 'valid'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'pending' THEN 'pending'
    ELSE 'none' END;
  UPDATE public.profiles SET kyc_status = _s WHERE id = NEW.user_id;
  -- If KYC not valid, force visibility off
  IF _s <> 'valid' THEN
    UPDATE public.profiles
      SET visibility_status = 'inactive', is_published = false
      WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_kyc_to_profile ON public.kyc_submissions;
CREATE TRIGGER sync_kyc_to_profile
AFTER INSERT OR UPDATE OF status ON public.kyc_submissions
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_kyc_status();

-- 3. activate_visibility RPC (requires KYC valid + tokens)
CREATE OR REPLACE FUNCTION public.activate_visibility()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _cost int; _days int; _balance int; _new_until timestamptz;
  _kyc text; _is_provider boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_uid AND role='provider') INTO _is_provider;
  IF NOT _is_provider THEN RAISE EXCEPTION 'Seuls les prestataires peuvent activer leur visibilité'; END IF;
  SELECT kyc_status INTO _kyc FROM public.profiles WHERE id=_uid;
  IF _kyc <> 'valid' THEN RAISE EXCEPTION 'Votre KYC doit être validé avant d''activer votre visibilité'; END IF;

  SELECT (value)::int INTO _cost FROM public.app_settings WHERE key='profile_publish_cost';
  IF _cost IS NULL THEN _cost := 20; END IF;
  SELECT (value)::int INTO _days FROM public.app_settings WHERE key='profile_publish_duration_days';
  IF _days IS NULL THEN _days := 30; END IF;

  SELECT balance_tokens INTO _balance FROM public.wallets WHERE user_id=_uid FOR UPDATE;
  IF _balance IS NULL OR _balance < _cost THEN RAISE EXCEPTION 'Solde insuffisant (% jetons requis)', _cost; END IF;

  UPDATE public.wallets SET balance_tokens = balance_tokens - _cost, updated_at = now() WHERE user_id=_uid;

  SELECT GREATEST(COALESCE(visibility_until, now()), now()) + make_interval(days => _days)
    INTO _new_until FROM public.profiles WHERE id=_uid;

  UPDATE public.profiles
    SET visibility_status='active', visibility_until=_new_until,
        is_published=true, published_at=COALESCE(published_at, now()), published_until=_new_until
    WHERE id=_uid;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (_uid, -_cost, 'visibility', 'Activation visibilité (' || _days || ' jours)');

  RETURN jsonb_build_object('new_balance', _balance - _cost, 'cost', _cost, 'visibility_until', _new_until);
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_visibility() TO authenticated;

-- 4. Marketplace RPC: services with provider info, filtered by KYC + visibility
CREATE OR REPLACE FUNCTION public.get_marketplace_services(
  _q text DEFAULT NULL,
  _category text DEFAULT NULL,
  _min_rating numeric DEFAULT NULL,
  _min_price numeric DEFAULT NULL,
  _max_price numeric DEFAULT NULL,
  _sort text DEFAULT 'newest'
)
RETURNS TABLE (
  id uuid, title text, description text, price numeric, category text, created_at timestamptz,
  provider_id uuid, provider_name text, provider_avatar text, provider_city text,
  provider_rating numeric, provider_reviews_count int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH base AS (
    SELECT s.id, s.title, s.description, s.price, s.category, s.created_at,
           p.id AS provider_id, p.name AS provider_name, p.avatar_url AS provider_avatar, p.city AS provider_city,
           COALESCE((SELECT round(avg(r.rating)::numeric,2) FROM public.reviews r WHERE r.provider_id = p.id), 0) AS provider_rating,
           COALESCE((SELECT count(*)::int FROM public.reviews r WHERE r.provider_id = p.id), 0) AS provider_reviews_count
    FROM public.services s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE p.kyc_status = 'valid'
      AND p.visibility_status = 'active'
      AND (p.visibility_until IS NULL OR p.visibility_until > now())
      AND NOT p.suspended
  )
  SELECT * FROM base
  WHERE (_category IS NULL OR _category = '' OR category = _category)
    AND (_min_price IS NULL OR price >= _min_price)
    AND (_max_price IS NULL OR price <= _max_price)
    AND (_min_rating IS NULL OR provider_rating >= _min_rating)
    AND (
      _q IS NULL OR _q = '' OR
      title ILIKE '%' || _q || '%' OR
      coalesce(description,'') ILIKE '%' || _q || '%' OR
      provider_name ILIKE '%' || _q || '%'
    )
  ORDER BY
    CASE WHEN _sort = 'oldest' THEN created_at END ASC,
    CASE WHEN _sort = 'price_asc' THEN price END ASC NULLS LAST,
    CASE WHEN _sort = 'price_desc' THEN price END DESC NULLS LAST,
    CASE WHEN _sort = 'rating' THEN provider_rating END DESC NULLS LAST,
    CASE WHEN _sort IS NULL OR _sort NOT IN ('oldest','price_asc','price_desc','rating') THEN created_at END DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_marketplace_services(text, text, numeric, numeric, numeric, text) TO anon, authenticated;

-- 5. Check helper: is a provider currently visible?
CREATE OR REPLACE FUNCTION public.provider_is_visible(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _id
      AND kyc_status = 'valid'
      AND visibility_status = 'active'
      AND (visibility_until IS NULL OR visibility_until > now())
      AND NOT suspended
  )
$$;
GRANT EXECUTE ON FUNCTION public.provider_is_visible(uuid) TO anon, authenticated;
