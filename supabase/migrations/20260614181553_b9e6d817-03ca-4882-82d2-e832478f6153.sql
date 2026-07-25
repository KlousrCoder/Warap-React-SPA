GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

REVOKE EXECUTE ON FUNCTION public.complete_provider_onboarding(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_provider_onboarding(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_provider_onboarding(_category text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _allowed_categories text[] := ARRAY['plomberie','electricite','maconnerie','peinture','menuiserie','toiture','carrelage','architecture','renovation','climatisation'];
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _category IS NULL OR NOT (_category = ANY(_allowed_categories)) THEN
    RAISE EXCEPTION 'Catégorie invalide';
  END IF;

  INSERT INTO public.profiles (id, name, email, full_name, provider_category)
  VALUES (_uid, 'Prestataire', '', 'Prestataire', _category)
  ON CONFLICT (id) DO UPDATE
  SET provider_category = EXCLUDED.provider_category;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'provider')
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.user_roles
  WHERE user_id = _uid AND role = 'client';

  RETURN jsonb_build_object('role', 'provider', 'provider_category', _category);
END;
$function$;