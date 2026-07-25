-- 1. Admins can view all user_roles
DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 2. Portfolio: approval workflow
ALTER TABLE public.portfolio ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.portfolio ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.portfolio ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.portfolio ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE public.portfolio ADD CONSTRAINT portfolio_status_check CHECK (status IN ('pending','approved','rejected'));

-- 3. Replace portfolio policies
DROP POLICY IF EXISTS "Portfolio public read" ON public.portfolio;
DROP POLICY IF EXISTS "Owner manages portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "Public reads approved portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "Owner reads own portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "Owner inserts portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "Owner updates own pending portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "Owner deletes own pending portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "Admins manage all portfolio" ON public.portfolio;

CREATE POLICY "Public reads approved portfolio" ON public.portfolio
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY "Owner reads own portfolio" ON public.portfolio
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner inserts portfolio" ON public.portfolio
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner updates own pending portfolio" ON public.portfolio
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Owner deletes own pending portfolio" ON public.portfolio
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins manage all portfolio" ON public.portfolio
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 4. review_portfolio RPC
CREATE OR REPLACE FUNCTION public.review_portfolio(_portfolio_id uuid, _status text, _notes text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid; _title text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_admin(_uid) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  UPDATE public.portfolio
    SET status = _status, notes = _notes, reviewed_at = now(), reviewed_by = _uid
    WHERE id = _portfolio_id
    RETURNING user_id, title INTO _owner, _title;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Réalisation introuvable'; END IF;

  INSERT INTO public.notifications (user_id, title, content)
    VALUES (_owner,
      CASE WHEN _status = 'approved' THEN 'Réalisation validée ✅' ELSE 'Réalisation refusée' END,
      CASE WHEN _status = 'approved'
           THEN 'Votre réalisation « ' || COALESCE(_title,'') || ' » a été validée et est désormais visible publiquement.'
           ELSE COALESCE(_notes, 'Votre réalisation a été refusée.') END);

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.review_portfolio(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_portfolio(uuid, text, text) TO authenticated;