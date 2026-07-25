
INSERT INTO public.app_settings (key, value)
VALUES ('project_post_cost', '10'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_project(_title text, _description text, _budget numeric, _city text, _category text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid(); _cost int; _balance int; _id uuid; _is_client boolean;
  _allowed text[] := ARRAY['plomberie','electricite','maconnerie','peinture','menuiserie','toiture','carrelage','architecture','renovation','climatisation'];
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _title IS NULL OR length(trim(_title)) < 3 THEN RAISE EXCEPTION 'Titre requis'; END IF;
  IF _description IS NULL OR length(trim(_description)) < 10 THEN RAISE EXCEPTION 'Description trop courte'; END IF;
  IF _category IS NOT NULL AND NOT (_category = ANY(_allowed)) THEN RAISE EXCEPTION 'Catégorie invalide'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role IN ('client','admin')) INTO _is_client;
  IF NOT _is_client THEN RAISE EXCEPTION 'Seuls les clients peuvent publier une offre'; END IF;
  SELECT (value)::int INTO _cost FROM public.app_settings WHERE key = 'project_post_cost';
  IF _cost IS NULL THEN _cost := 10; END IF;
  SELECT balance_tokens INTO _balance FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _balance IS NULL OR _balance < _cost THEN RAISE EXCEPTION 'Solde insuffisant (% jetons requis)', _cost; END IF;
  UPDATE public.wallets SET balance_tokens = balance_tokens - _cost, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.projects (client_id, title, description, budget, city, category, status)
    VALUES (_uid, _title, _description, _budget, _city, _category, 'open') RETURNING id INTO _id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (_uid, -_cost, 'project_post', 'Publication offre: ' || _title);
  INSERT INTO public.notifications (user_id, title, content)
    VALUES (_uid, 'Offre publiée', 'Votre offre « ' || _title || ' » est en ligne.');

  -- Notify matching providers
  INSERT INTO public.notifications (user_id, title, content)
  SELECT ur.user_id,
         'Nouvelle offre disponible',
         'Une nouvelle offre vous concerne : « ' || _title || ' »' ||
           CASE WHEN _city IS NOT NULL AND _city <> '' THEN ' à ' || _city ELSE '' END
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'provider'
    AND NOT COALESCE(p.suspended, false)
    AND (_category IS NULL OR p.provider_category IS NULL OR p.provider_category = _category);

  RETURN jsonb_build_object('project_id', _id, 'new_balance', _balance - _cost, 'cost', _cost);
END; $function$;
