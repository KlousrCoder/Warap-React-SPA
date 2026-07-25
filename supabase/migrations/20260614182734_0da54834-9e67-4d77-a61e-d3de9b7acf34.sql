
CREATE TABLE public.diplomas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  institution text,
  year int,
  document_url text,
  document_path text,
  badge_color text NOT NULL DEFAULT '#ea7c2c',
  status text NOT NULL DEFAULT 'pending',
  notes text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT diplomas_status_chk CHECK (status IN ('pending','approved','rejected'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diplomas TO authenticated;
GRANT SELECT ON public.diplomas TO anon;
GRANT ALL ON public.diplomas TO service_role;

ALTER TABLE public.diplomas ENABLE ROW LEVEL SECURITY;

-- Owner full management of own pending diplomas (insert/update/delete)
CREATE POLICY "Owner can insert diploma" ON public.diplomas
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner reads own diplomas" ON public.diplomas
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner updates own pending diploma" ON public.diplomas
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner deletes own pending diploma" ON public.diplomas
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

-- Admin full access
CREATE POLICY "Admins manage all diplomas" ON public.diplomas
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Public read of approved diplomas (for badges on public profile)
CREATE POLICY "Public reads approved diplomas" ON public.diplomas
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER diplomas_set_updated_at
  BEFORE UPDATE ON public.diplomas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX diplomas_user_idx ON public.diplomas(user_id);
CREATE INDEX diplomas_status_idx ON public.diplomas(status);

-- Admin review function (creates notification + sets reviewed metadata)
CREATE OR REPLACE FUNCTION public.review_diploma(_diploma_id uuid, _status text, _notes text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid; _title text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_admin(_uid) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  UPDATE public.diplomas
    SET status = _status, notes = _notes, reviewed_at = now(), reviewed_by = _uid
    WHERE id = _diploma_id
    RETURNING user_id, title INTO _owner, _title;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Diploma not found'; END IF;

  INSERT INTO public.notifications (user_id, title, content)
    VALUES (_owner,
      CASE WHEN _status = 'approved' THEN 'Diplôme validé 🎓' ELSE 'Diplôme refusé' END,
      CASE WHEN _status = 'approved'
           THEN 'Votre diplôme « ' || COALESCE(_title,'') || ' » a été validé. Un badge a été ajouté à votre profil.'
           ELSE COALESCE(_notes, 'Votre diplôme a été refusé. Veuillez en soumettre un autre.') END);

  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION public.review_diploma(uuid, text, text) TO authenticated;
