REVOKE EXECUTE ON FUNCTION public.complete_provider_onboarding(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_provider_onboarding(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_provider_onboarding(text) TO authenticated;