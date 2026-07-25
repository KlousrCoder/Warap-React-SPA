
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_until timestamptz;

ALTER TABLE public.portfolio
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS completed_at date,
  ADD COLUMN IF NOT EXISTS location text;

INSERT INTO public.app_settings(key, value) VALUES
  ('profile_publish_cost', '20'),
  ('profile_publish_duration_days', '30')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.publish_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cost int;
  _days int;
  _balance int;
  _new_until timestamptz;
  _is_provider boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'provider') INTO _is_provider;
  IF NOT _is_provider THEN RAISE EXCEPTION 'Seuls les prestataires peuvent publier leur profil'; END IF;

  SELECT (value)::int INTO _cost FROM public.app_settings WHERE key = 'profile_publish_cost';
  IF _cost IS NULL THEN _cost := 20; END IF;
  SELECT (value)::int INTO _days FROM public.app_settings WHERE key = 'profile_publish_duration_days';
  IF _days IS NULL THEN _days := 30; END IF;

  SELECT balance_tokens INTO _balance FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _balance IS NULL OR _balance < _cost THEN RAISE EXCEPTION 'Solde insuffisant (% jetons requis)', _cost; END IF;

  UPDATE public.wallets SET balance_tokens = balance_tokens - _cost, updated_at = now() WHERE user_id = _uid;

  SELECT GREATEST(COALESCE(published_until, now()), now()) + make_interval(days => _days)
    INTO _new_until FROM public.profiles WHERE id = _uid;

  UPDATE public.profiles
    SET is_published = true,
        published_at = COALESCE(published_at, now()),
        published_until = _new_until
    WHERE id = _uid;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (_uid, -_cost, 'publish_profile', 'Publication du profil (' || _days || ' jours)');

  RETURN jsonb_build_object('new_balance', _balance - _cost, 'cost', _cost, 'published_until', _new_until);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_message(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(_a) OR public.is_admin(_b)
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE (m.sender_id = _a AND m.receiver_id = _b)
         OR (m.sender_id = _b AND m.receiver_id = _a)
    )
$$;

CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE(contact_id uuid, full_name text, name text, avatar_url text, is_admin boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  admins AS (SELECT user_id FROM public.user_roles WHERE role = 'admin'),
  rels AS (
    SELECT a.user_id AS contact
      FROM admins a, me
      WHERE a.user_id <> me.uid
    UNION
    SELECT CASE WHEN m.sender_id = me.uid THEN m.receiver_id ELSE m.sender_id END
      FROM public.messages m, me
      WHERE m.sender_id = me.uid OR m.receiver_id = me.uid
  )
  SELECT DISTINCT pr.id, pr.full_name, pr.name, pr.avatar_url,
         EXISTS(SELECT 1 FROM admins a WHERE a.user_id = pr.id) AS is_admin
  FROM rels r JOIN public.profiles pr ON pr.id = r.contact
  WHERE r.contact IS NOT NULL AND r.contact <> auth.uid();
$$;
