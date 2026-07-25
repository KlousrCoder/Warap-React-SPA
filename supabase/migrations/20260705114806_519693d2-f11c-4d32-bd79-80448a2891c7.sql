
-- 1) Fix search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- 2) Revoke EXECUTE from anon on RPC that require an authenticated session.
--    (Keep authenticated + service_role.)
REVOKE EXECUTE ON FUNCTION public.apply_to_project(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.boost_application(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_project(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.contact_provider(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_project(text, text, numeric, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recharge_wallet(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.publish_profile() FROM anon;
REVOKE EXECUTE ON FUNCTION public.activate_visibility() FROM anon;
REVOKE EXECUTE ON FUNCTION public.select_provider(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.refund_selection(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_portfolio(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_diploma(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_provider_onboarding(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_conversations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_project_applications(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_project_application_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_open_projects() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_message(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;

-- 3) Restrict listing on public storage buckets (files remain reachable via direct URL).
--    Drop any broad SELECT policy on storage.objects for these buckets.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='storage' AND tablename='objects'
             AND policyname ILIKE '%avatars%public%'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname); END LOOP;
END $$;
