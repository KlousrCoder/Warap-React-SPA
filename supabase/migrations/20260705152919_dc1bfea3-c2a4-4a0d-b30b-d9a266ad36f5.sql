REVOKE EXECUTE ON FUNCTION public.contact_provider(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.contact_provider(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.contact_provider(uuid, text) TO authenticated;