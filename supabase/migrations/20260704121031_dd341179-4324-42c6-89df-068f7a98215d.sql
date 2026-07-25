
INSERT INTO public.app_settings(key, value) VALUES
  ('signup_bonus_tokens', '50'::jsonb),
  ('token_price_fcfa', '100'::jsonb),
  ('min_recharge_amount', '1'::jsonb),
  ('max_recharge_amount', '1000'::jsonb),
  ('notification_toast_duration_ms', '10000'::jsonb),
  ('whatsapp_notifications_enabled', 'true'::jsonb),
  ('notify_new_project_to_providers', 'true'::jsonb),
  ('max_portfolio_items_per_provider', '20'::jsonb),
  ('max_diplomas_per_provider', '10'::jsonb),
  ('support_email', '"support@warap.app"'::jsonb),
  ('support_phone', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;

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
  _bonus int;
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

  SELECT (value)::int INTO _bonus FROM public.app_settings WHERE key = 'signup_bonus_tokens';
  IF _bonus IS NULL THEN _bonus := 50; END IF;

  INSERT INTO public.profiles (id, name, email, full_name, provider_category)
    VALUES (NEW.id, _name, NEW.email, _name, CASE WHEN _role = 'provider' THEN _cat ELSE NULL END)
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.wallets (user_id, balance_tokens) VALUES (NEW.id, _bonus)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recharge_wallet(_amount integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _new integer;
  _min int;
  _max int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT (value)::int INTO _min FROM public.app_settings WHERE key = 'min_recharge_amount';
  SELECT (value)::int INTO _max FROM public.app_settings WHERE key = 'max_recharge_amount';
  IF _min IS NULL THEN _min := 1; END IF;
  IF _max IS NULL THEN _max := 1000; END IF;
  IF _amount IS NULL OR _amount < _min OR _amount > _max THEN
    RAISE EXCEPTION 'Montant invalide (entre % et %)', _min, _max;
  END IF;
  UPDATE public.wallets SET balance_tokens = balance_tokens + _amount, updated_at = now()
    WHERE user_id = _uid RETURNING balance_tokens INTO _new;
  IF _new IS NULL THEN
    INSERT INTO public.wallets (user_id, balance_tokens) VALUES (_uid, _amount) RETURNING balance_tokens INTO _new;
  END IF;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (_uid, _amount, 'recharge', 'Recharge de ' || _amount || ' jetons');
  RETURN jsonb_build_object('new_balance', _new);
END;
$function$;
