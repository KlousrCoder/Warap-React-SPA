CREATE OR REPLACE FUNCTION public.create_project(_title text, _description text, _budget numeric, _city text, _category text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid(); _cost int; _balance int; _id uuid; _is_client boolean;
  _allowed text[] := ARRAY['plomberie','electricite','maconnerie','peinture','menuiserie','toiture','carrelage','architecture','renovation','climatisation'];
  _budget_txt text; _desc_short text; _days int; _expires timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _title IS NULL OR length(trim(_title)) < 3 THEN RAISE EXCEPTION 'Titre requis'; END IF;
  IF _description IS NULL OR length(trim(_description)) < 10 THEN RAISE EXCEPTION 'Description trop courte'; END IF;
  IF _category IS NULL OR NOT (_category = ANY(_allowed)) THEN RAISE EXCEPTION 'Catégorie obligatoire et valide'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role IN ('client','admin')) INTO _is_client;
  IF NOT _is_client THEN RAISE EXCEPTION 'Seuls les clients peuvent publier une offre'; END IF;
  SELECT (value)::int INTO _cost FROM public.app_settings WHERE key = 'project_post_cost';
  IF _cost IS NULL THEN _cost := 10; END IF;
  SELECT (value)::int INTO _days FROM public.app_settings WHERE key = 'project_duration_days';
  IF _days IS NULL THEN _days := 30; END IF;
  _expires := now() + make_interval(days => _days);
  SELECT balance_tokens INTO _balance FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _balance IS NULL OR _balance < _cost THEN RAISE EXCEPTION 'Solde insuffisant (% jetons requis)', _cost; END IF;
  UPDATE public.wallets SET balance_tokens = balance_tokens - _cost, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.projects (client_id, title, description, budget, city, category, status, expires_at)
    VALUES (_uid, _title, _description, _budget, _city, _category, 'open', _expires) RETURNING id INTO _id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (_uid, -_cost, 'project_post', 'Publication offre: ' || _title);
  INSERT INTO public.notifications (user_id, title, content)
    VALUES (_uid, 'Offre publiée', 'Votre offre « ' || _title || ' » est en ligne pour ' || _days || ' jours.');
  _budget_txt := CASE WHEN _budget IS NOT NULL THEN ' • Budget: ' || _budget::text || ' FCFA' ELSE '' END;
  _desc_short := CASE WHEN length(_description) > 120 THEN left(_description, 120) || '…' ELSE _description END;
  INSERT INTO public.notifications (user_id, title, content, link)
  SELECT ur.user_id, '🔔 Nouvelle offre: ' || _title,
         'Catégorie: ' || _category ||
           CASE WHEN _city IS NOT NULL AND _city <> '' THEN ' • Lieu: ' || _city ELSE '' END ||
           _budget_txt || E'\n' || _desc_short,
         '/dashboard/provider/projects'
  FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'provider' AND NOT COALESCE(p.suspended, false) AND p.provider_category = _category;
  RETURN jsonb_build_object('project_id', _id, 'new_balance', _balance - _cost, 'cost', _cost, 'expires_at', _expires);
END; $function$;