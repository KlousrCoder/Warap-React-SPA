
-- ============ PROFILES extension ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Public read of profiles for marketplace
DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;
CREATE POLICY "Profiles public read" ON public.profiles
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.profiles TO anon;

-- Admins manage all profiles
DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
CREATE POLICY "Admins manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ WALLETS ============
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance_tokens integer NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view wallets" ON public.wallets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ PROJECTS ============
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  budget numeric,
  status text NOT NULL DEFAULT 'open',
  city text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects public read" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Client creates project" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Client updates own project" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = client_id);
CREATE POLICY "Client deletes own project" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = client_id);
CREATE POLICY "Admins manage projects" ON public.projects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ APPLICATIONS ============
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  prestataire_id uuid NOT NULL,
  cover_letter text,
  token_cost integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, prestataire_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prestataire view own applications" ON public.applications FOR SELECT TO authenticated USING (auth.uid() = prestataire_id);
CREATE POLICY "Client view project applications" ON public.applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.client_id = auth.uid()));
CREATE POLICY "Client updates application status" ON public.applications FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.client_id = auth.uid()));
CREATE POLICY "Admins manage applications" ON public.applications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ SERVICES ============
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  price numeric,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services public read" ON public.services FOR SELECT USING (true);
CREATE POLICY "Owner manages services" ON public.services FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ PORTFOLIO ============
CREATE TABLE IF NOT EXISTS public.portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portfolio TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio TO authenticated;
GRANT ALL ON public.portfolio TO service_role;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portfolio public read" ON public.portfolio FOR SELECT USING (true);
CREATE POLICY "Owner manages portfolio" ON public.portfolio FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ MESSAGES ============
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Sender writes messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio','portfolio',true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users upload avatars" ON storage.objects;
CREATE POLICY "Users upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users update avatars" ON storage.objects;
CREATE POLICY "Users update avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users delete avatars" ON storage.objects;
CREATE POLICY "Users delete avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Public read portfolio" ON storage.objects;
CREATE POLICY "Public read portfolio" ON storage.objects FOR SELECT USING (bucket_id = 'portfolio');
DROP POLICY IF EXISTS "Users upload portfolio" ON storage.objects;
CREATE POLICY "Users upload portfolio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users update portfolio" ON storage.objects;
CREATE POLICY "Users update portfolio" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users delete portfolio" ON storage.objects;
CREATE POLICY "Users delete portfolio" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============ HANDLE NEW USER (extended with wallet) ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
  _name TEXT;
BEGIN
  _name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  _role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'client')::public.app_role;
  IF _role = 'admin' THEN _role := 'client'; END IF;

  INSERT INTO public.profiles (id, name, email, full_name) VALUES (NEW.id, _name, NEW.email, _name)
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.wallets (user_id, balance_tokens) VALUES (NEW.id, 50)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RPC apply_to_project ============
CREATE OR REPLACE FUNCTION public.apply_to_project(_project_id uuid, _cover_letter text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _cost integer := 5;
  _balance integer;
  _client uuid;
  _title text;
  _app_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT client_id, title INTO _client, _title FROM public.projects WHERE id = _project_id AND status = 'open';
  IF _client IS NULL THEN RAISE EXCEPTION 'Project not available'; END IF;
  IF _client = _uid THEN RAISE EXCEPTION 'Cannot apply to own project'; END IF;
  SELECT balance_tokens INTO _balance FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _balance IS NULL OR _balance < _cost THEN RAISE EXCEPTION 'Insufficient tokens'; END IF;

  UPDATE public.wallets SET balance_tokens = balance_tokens - _cost, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.applications (project_id, prestataire_id, cover_letter, token_cost)
    VALUES (_project_id, _uid, _cover_letter, _cost)
    RETURNING id INTO _app_id;
  INSERT INTO public.notifications (user_id, title, content)
    VALUES (_client, 'Nouvelle candidature', 'Vous avez reçu une candidature pour: ' || _title);
  RETURN jsonb_build_object('application_id', _app_id, 'new_balance', _balance - _cost);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_to_project(uuid, text) TO authenticated;

-- Backfill wallets for existing users
INSERT INTO public.wallets (user_id, balance_tokens)
SELECT id, 50 FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.wallets);
