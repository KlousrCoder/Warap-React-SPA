
CREATE TABLE public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  document_url text NOT NULL,
  document_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner views own kyc" ON public.kyc_submissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts own kyc" ON public.kyc_submissions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates own kyc" ON public.kyc_submissions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins view all kyc" ON public.kyc_submissions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update kyc" ON public.kyc_submissions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO storage.buckets (id, name, public) VALUES ('kyc', 'kyc', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own kyc files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users read own kyc files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins read all kyc files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc' AND public.has_role(auth.uid(), 'admin'));
