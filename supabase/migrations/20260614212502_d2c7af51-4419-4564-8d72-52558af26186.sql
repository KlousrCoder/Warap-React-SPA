DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker=on) AS
SELECT id, name, full_name, avatar_url, cover_url, bio, city, suspended,
       provider_category, is_published, published_at, published_until,
       kyc_status, visibility_status, visibility_until, created_at
FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_provider_profile(_id uuid)
RETURNS TABLE(
  id uuid, name text, full_name text, avatar_url text, cover_url text,
  bio text, city text, suspended boolean, provider_category text,
  is_published boolean, published_at timestamptz, published_until timestamptz,
  kyc_status text, visibility_status text, visibility_until timestamptz, created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.name, p.full_name, p.avatar_url, p.cover_url, p.bio, p.city, p.suspended,
         p.provider_category, p.is_published, p.published_at, p.published_until,
         p.kyc_status, p.visibility_status, p.visibility_until, p.created_at
  FROM public.profiles p
  WHERE p.id = _id
    AND NOT p.suspended
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'provider');
$$;
GRANT EXECUTE ON FUNCTION public.get_provider_profile(uuid) TO anon, authenticated;