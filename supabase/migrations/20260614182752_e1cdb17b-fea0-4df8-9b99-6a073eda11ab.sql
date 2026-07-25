
CREATE POLICY "Users upload diplomas" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'diplomas' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own diplomas" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'diplomas' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own diplomas" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'diplomas' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own diplomas" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'diplomas' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins read all diplomas" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'diplomas' AND public.is_admin(auth.uid()));
