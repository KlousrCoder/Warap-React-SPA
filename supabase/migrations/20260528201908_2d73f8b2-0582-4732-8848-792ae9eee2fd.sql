
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider_category text;

INSERT INTO public.app_settings (key, value) VALUES ('contact_token_cost', '3'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _role public.app_role;
  _name TEXT;
  _cat TEXT;
BEGIN
  _name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  _role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'client')::public.app_role;
  IF _role = 'admin' THEN _role := 'client'; END IF;
  _cat := NULLIF(NEW.raw_user_meta_data->>'provider_category', '');

  INSERT INTO public.profiles (id, name, email, full_name, provider_category)
    VALUES (NEW.id, _name, NEW.email, _name, CASE WHEN _role = 'provider' THEN _cat ELSE NULL END)
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.wallets (user_id, balance_tokens) VALUES (NEW.id, 50)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.contact_provider(_provider_id uuid, _message text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _cost integer;
  _balance integer;
  _sender_name text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _uid = _provider_id THEN RAISE EXCEPTION 'Cannot contact yourself'; END IF;
  IF _message IS NULL OR length(trim(_message)) < 3 THEN RAISE EXCEPTION 'Message required'; END IF;

  SELECT (value)::int INTO _cost FROM public.app_settings WHERE key = 'contact_token_cost';
  IF _cost IS NULL THEN _cost := 3; END IF;

  SELECT balance_tokens INTO _balance FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _balance IS NULL OR _balance < _cost THEN RAISE EXCEPTION 'Insufficient tokens'; END IF;

  UPDATE public.wallets SET balance_tokens = balance_tokens - _cost, updated_at = now() WHERE user_id = _uid;

  SELECT COALESCE(full_name, name, 'Un client') INTO _sender_name FROM public.profiles WHERE id = _uid;

  INSERT INTO public.messages (sender_id, receiver_id, content) VALUES (_uid, _provider_id, _message);
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (_uid, -_cost, 'contact', 'Contact prestataire');
  INSERT INTO public.notifications (user_id, title, content)
    VALUES (_provider_id, 'Nouveau message', _sender_name || ' souhaite vous contacter.');

  RETURN jsonb_build_object('new_balance', _balance - _cost, 'cost', _cost);
END;
$$;
