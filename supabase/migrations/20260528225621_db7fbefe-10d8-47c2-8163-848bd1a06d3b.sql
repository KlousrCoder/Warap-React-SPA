
INSERT INTO public.app_settings (key, value) VALUES ('max_applications_per_project', '5'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.apply_to_project(_project_id uuid, _cover_letter text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _cost integer;
  _max integer;
  _current_count integer;
  _balance integer;
  _client uuid;
  _title text;
  _app_id uuid;
  _position integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT (value)::int INTO _cost FROM public.app_settings WHERE key = 'application_token_cost';
  IF _cost IS NULL THEN _cost := 5; END IF;

  SELECT (value)::int INTO _max FROM public.app_settings WHERE key = 'max_applications_per_project';
  IF _max IS NULL THEN _max := 5; END IF;

  SELECT client_id, title INTO _client, _title FROM public.projects WHERE id = _project_id AND status = 'open';
  IF _client IS NULL THEN RAISE EXCEPTION 'Project not available'; END IF;
  IF _client = _uid THEN RAISE EXCEPTION 'Cannot apply to own project'; END IF;

  IF EXISTS (SELECT 1 FROM public.applications WHERE project_id = _project_id AND prestataire_id = _uid) THEN
    RAISE EXCEPTION 'Vous avez déjà postulé à cette offre';
  END IF;

  SELECT count(*) INTO _current_count FROM public.applications WHERE project_id = _project_id;
  IF _current_count >= _max THEN
    RAISE EXCEPTION 'Cette offre a atteint le maximum de % candidatures', _max;
  END IF;

  SELECT balance_tokens INTO _balance FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _balance IS NULL OR _balance < _cost THEN RAISE EXCEPTION 'Insufficient tokens'; END IF;

  UPDATE public.wallets SET balance_tokens = balance_tokens - _cost, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.applications (project_id, prestataire_id, cover_letter, token_cost)
    VALUES (_project_id, _uid, _cover_letter, _cost) RETURNING id INTO _app_id;
  _position := _current_count + 1;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (_uid, -_cost, 'application', 'Candidature: ' || _title);
  INSERT INTO public.notifications (user_id, title, content)
    VALUES (_client, 'Nouvelle candidature', 'Vous avez reçu une candidature pour: ' || _title);
  INSERT INTO public.notifications (user_id, title, content)
    VALUES (_uid, 'Candidature enregistrée', 'Vous êtes classé #' || _position || ' sur ' || _max || ' pour: ' || _title);
  RETURN jsonb_build_object('application_id', _app_id, 'new_balance', _balance - _cost, 'position', _position, 'max', _max);
END;
$function$;
