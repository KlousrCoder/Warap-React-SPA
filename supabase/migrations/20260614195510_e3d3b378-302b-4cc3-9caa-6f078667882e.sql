DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker=on) AS
SELECT id, name, full_name, avatar_url, cover_url, bio, city, suspended, provider_category,
       is_published, published_at, published_until, kyc_status, visibility_status, visibility_until, created_at
FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;