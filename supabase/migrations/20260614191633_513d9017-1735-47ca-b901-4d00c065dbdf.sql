DROP POLICY IF EXISTS "Users upload portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Users update portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Users delete portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Users upload diplomas" ON storage.objects;
DROP POLICY IF EXISTS "Users update own diplomas" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own diplomas" ON storage.objects;

CREATE POLICY "Users upload portfolio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'portfolio'
  AND owner_id = (select auth.uid())::text
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

CREATE POLICY "Users update portfolio"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'portfolio'
  AND owner_id = (select auth.uid())::text
  AND (storage.foldername(name))[1] = (select auth.uid())::text
)
WITH CHECK (
  bucket_id = 'portfolio'
  AND owner_id = (select auth.uid())::text
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

CREATE POLICY "Users delete portfolio"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'portfolio'
  AND owner_id = (select auth.uid())::text
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

CREATE POLICY "Users upload diplomas"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'diplomas'
  AND owner_id = (select auth.uid())::text
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

CREATE POLICY "Users update own diplomas"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'diplomas'
  AND owner_id = (select auth.uid())::text
  AND (storage.foldername(name))[1] = (select auth.uid())::text
)
WITH CHECK (
  bucket_id = 'diplomas'
  AND owner_id = (select auth.uid())::text
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

CREATE POLICY "Users delete own diplomas"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'diplomas'
  AND owner_id = (select auth.uid())::text
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);