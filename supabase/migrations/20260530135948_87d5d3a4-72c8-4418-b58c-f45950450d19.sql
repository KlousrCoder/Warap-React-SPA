
-- 1. Schema additions
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS selected_provider_id uuid,
  ADD COLUMN IF NOT EXISTS selected_at timestamptz;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- 2. Refund window setting (min 6h enforced server-side)
INSERT INTO public.app_settings(key, value) VALUES ('refund_window_hours', '6'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Helpers
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.can_message(_a uuid, _b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    public.is_admin(_a) OR public.is_admin(_b)
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE (p.client_id = _a AND p.selected_provider_id = _b)
         OR (p.client_id = _b AND p.selected_provider_id = _a)
    )
$$;

-- 4. Replace messages policies (restrict to authorized pairs)
DROP POLICY IF EXISTS "Participants read messages" ON public.messages;
DROP POLICY IF EXISTS "Sender writes messages" ON public.messages;

CREATE POLICY "Participants read allowed messages" ON public.messages FOR SELECT TO authenticated
  USING ((auth.uid() = sender_id OR auth.uid() = receiver_id) AND public.can_message(sender_id, receiver_id));

CREATE POLICY "Sender writes allowed messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.can_message(sender_id, receiver_id));

-- 5. RPC: select a provider for a project
CREATE OR REPLACE FUNCTION public.select_provider(_project_id uuid, _application_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _client uuid; _provider uuid; _title text; _current uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT client_id, title, selected_provider_id INTO _client, _title, _current
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

  INSERT INTO public.notifications (user_id, title, content) VALUES
    (_provider, 'Vous avez été retenu ✅', 'Vous êtes le prestataire sélectionné pour : ' || COALESCE(_title,''));
  RETURN jsonb_build_object('ok', true, 'provider_id', _provider);
END;$$;

-- 6. RPC: cancel selection within refund window
CREATE OR REPLACE FUNCTION public.refund_selection(_project_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _client uuid; _provider uuid; _selected_at timestamptz; _window int; _title text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT client_id, selected_provider_id, selected_at, title 
    INTO _client, _provider, _selected_at, _title
    FROM public.projects WHERE id = _project_id FOR UPDATE;
  IF _client IS NULL THEN RAISE EXCEPTION 'Projet introuvable'; END IF;
  IF _client <> _uid THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  IF _provider IS NULL THEN RAISE EXCEPTION 'Aucune sélection à annuler'; END IF;
  SELECT GREATEST(COALESCE((value)::int, 6), 6) INTO _window 
    FROM public.app_settings WHERE key = 'refund_window_hours';
  IF _window IS NULL THEN _window := 6; END IF;
  IF now() - _selected_at > make_interval(hours => _window) THEN
    RAISE EXCEPTION 'Délai de remboursement dépassé (%h)', _window;
  END IF;

  UPDATE public.projects 
    SET selected_provider_id = NULL, selected_at = NULL, status = 'open' 
    WHERE id = _project_id;
  UPDATE public.applications SET status = 'pending', refunded_at = now() 
    WHERE project_id = _project_id;
  INSERT INTO public.notifications (user_id, title, content) VALUES
    (_provider, 'Sélection annulée', 'Le client a annulé sa sélection pour : ' || COALESCE(_title,''));
  RETURN jsonb_build_object('ok', true);
END;$$;

-- 7. RPC: list authorized contacts for current user
CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE(contact_id uuid, full_name text, name text, avatar_url text, is_admin boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  admins AS (SELECT user_id FROM public.user_roles WHERE role = 'admin'),
  rels AS (
    SELECT p.selected_provider_id AS contact 
      FROM public.projects p, me 
      WHERE p.client_id = me.uid AND p.selected_provider_id IS NOT NULL
    UNION
    SELECT p.client_id 
      FROM public.projects p, me 
      WHERE p.selected_provider_id = me.uid
    UNION
    SELECT a.user_id 
      FROM admins a, me 
      WHERE a.user_id <> me.uid
  )
  SELECT pr.id, pr.full_name, pr.name, pr.avatar_url, 
         EXISTS(SELECT 1 FROM admins a WHERE a.user_id = pr.id) AS is_admin
  FROM rels r JOIN public.profiles pr ON pr.id = r.contact;
$$;
