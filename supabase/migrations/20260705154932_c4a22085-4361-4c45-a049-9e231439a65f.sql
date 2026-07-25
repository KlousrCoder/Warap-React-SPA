
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

CREATE INDEX IF NOT EXISTS idx_messages_project_id ON public.messages(project_id);

-- Updated select_provider: notify + send recap message
CREATE OR REPLACE FUNCTION public.select_provider(_project_id uuid, _application_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _client uuid; _provider uuid; _title text; _current uuid;
  _description text; _budget numeric; _city text; _category text; _expires timestamptz;
  _content text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT client_id, title, selected_provider_id, description, budget, city, category, expires_at
    INTO _client, _title, _current, _description, _budget, _city, _category, _expires
    FROM public.projects WHERE id = _project_id FOR UPDATE;
  IF _client IS NULL THEN RAISE EXCEPTION 'Projet introuvable'; END IF;
  IF _client <> _uid THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  IF _current IS NOT NULL THEN RAISE EXCEPTION 'Un prestataire est déjà sélectionné'; END IF;
  SELECT prestataire_id INTO _provider FROM public.applications
    WHERE id = _application_id AND project_id = _project_id;
  IF _provider IS NULL THEN RAISE EXCEPTION 'Candidature introuvable'; END IF;

  UPDATE public.projects
    SET selected_provider_id = _provider, selected_at = now(), status = 'in_progress'
    WHERE id = _project_id;
  UPDATE public.applications SET status = 'selected' WHERE id = _application_id;
  UPDATE public.applications SET status = 'rejected'
    WHERE project_id = _project_id AND id <> _application_id AND status = 'pending';

  _content := '✅ Vous avez été retenu pour l''offre : ' || COALESCE(_title, '') || E'\n\n' ||
    '📋 Détails de la mission' || E'\n' ||
    CASE WHEN _category IS NOT NULL THEN '• Catégorie : ' || _category || E'\n' ELSE '' END ||
    CASE WHEN _city IS NOT NULL AND _city <> '' THEN '• Lieu : ' || _city || E'\n' ELSE '' END ||
    CASE WHEN _budget IS NOT NULL THEN '• Budget : ' || _budget::text || ' FCFA' || E'\n' ELSE '' END ||
    CASE WHEN _expires IS NOT NULL THEN '• Échéance : ' || to_char(_expires, 'DD/MM/YYYY') || E'\n' ELSE '' END ||
    E'\n📝 Description\n' || COALESCE(_description, '') || E'\n\n' ||
    'Prenez contact avec le client pour convenir des prochaines étapes.';

  INSERT INTO public.messages (sender_id, receiver_id, content, project_id, status)
    VALUES (_uid, _provider, _content, _project_id, 'open');

  INSERT INTO public.notifications (user_id, title, content) VALUES
    (_provider, 'Vous avez été retenu ✅', 'Vous êtes le prestataire sélectionné pour : ' || COALESCE(_title,''));
  RETURN jsonb_build_object('ok', true, 'provider_id', _provider);
END;$function$;

-- Trigger: when project becomes non-active, close related messages
CREATE OR REPLACE FUNCTION public.close_project_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('completed','cancelled','expired','closed') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.messages SET status = 'closed' WHERE project_id = NEW.id AND status <> 'closed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_project_messages ON public.projects;
CREATE TRIGGER trg_close_project_messages
AFTER UPDATE OF status ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.close_project_messages();
