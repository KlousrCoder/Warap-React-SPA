CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role public.app_role;
  _name TEXT;
  _cat TEXT;
  _allowed_categories text[] := ARRAY['plomberie','electricite','maconnerie','peinture','menuiserie','toiture','carrelage','architecture','renovation','climatisation'];
BEGIN
  _name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  _role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'client')::public.app_role;
  IF _role = 'admin' THEN _role := 'client'; END IF;
  _cat := NULLIF(NEW.raw_user_meta_data->>'provider_category', '');

  IF _role = 'provider' AND NOT (_cat = ANY(_allowed_categories)) THEN
    _role := 'client';
    _cat := NULL;
  END IF;

  INSERT INTO public.profiles (id, name, email, full_name, provider_category)
    VALUES (NEW.id, _name, NEW.email, _name, CASE WHEN _role = 'provider' THEN _cat ELSE NULL END)
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.wallets (user_id, balance_tokens) VALUES (NEW.id, 50)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

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

  UPDATE public.profiles
  SET provider_category = _category
  WHERE id = _uid;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'provider')
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.user_roles
  WHERE user_id = _uid AND role = 'client';

  RETURN jsonb_build_object('role', 'provider', 'provider_category', _category);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.complete_provider_onboarding(text) TO authenticated;