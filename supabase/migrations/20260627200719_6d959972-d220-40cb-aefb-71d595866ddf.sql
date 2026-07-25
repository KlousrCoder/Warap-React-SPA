
CREATE OR REPLACE FUNCTION public.cancel_project(_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid(); _client uuid; _status text; _selected uuid; _title text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT client_id, status, selected_provider_id, title INTO _client, _status, _selected, _title
    FROM public.projects WHERE id = _project_id FOR UPDATE;
  IF _client IS NULL THEN RAISE EXCEPTION 'Projet introuvable'; END IF;
  IF _client <> _uid THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  IF _selected IS NOT NULL THEN RAISE EXCEPTION 'Un prestataire est déjà sélectionné'; END IF;
  IF _status = 'cancelled' THEN RAISE EXCEPTION 'Offre déjà annulée'; END IF;
  UPDATE public.projects SET status = 'cancelled' WHERE id = _project_id;
  INSERT INTO public.notifications (user_id, title, content)
    VALUES (_uid, 'Offre annulée', 'Votre offre « ' || COALESCE(_title,'') || ' » a été annulée. Les jetons dépensés ne sont pas remboursables.');
  RETURN jsonb_build_object('ok', true, 'refund', 0);
END; $function$;
