CREATE OR REPLACE FUNCTION public.contact_provider(_provider_id uuid, _message text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _cost integer;
  _new_balance integer;
  _sender_name text;
  _message_id uuid;
  _message_created_at timestamptz;
  _is_provider boolean;
  _is_client boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _uid = _provider_id THEN
    RAISE EXCEPTION 'Cannot contact yourself';
  END IF;

  IF _message IS NULL OR length(trim(_message)) < 3 THEN
    RAISE EXCEPTION 'Message required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _uid AND role IN ('client', 'admin')
  ) INTO _is_client;

  IF NOT _is_client THEN
    RAISE EXCEPTION 'Seuls les utilisateurs peuvent contacter les prestataires';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _provider_id
      AND ur.role = 'provider'
      AND NOT COALESCE(p.suspended, false)
  ) INTO _is_provider;

  IF NOT _is_provider THEN
    RAISE EXCEPTION 'Prestataire introuvable';
  END IF;

  SELECT (value)::int INTO _cost FROM public.app_settings WHERE key = 'contact_token_cost';
  IF _cost IS NULL THEN
    _cost := 3;
  END IF;

  SELECT COALESCE(full_name, name, 'Un utilisateur') INTO _sender_name
  FROM public.profiles
  WHERE id = _uid;

  INSERT INTO public.messages (sender_id, receiver_id, content)
  VALUES (_uid, _provider_id, trim(_message))
  RETURNING id, created_at INTO _message_id, _message_created_at;

  UPDATE public.wallets
  SET balance_tokens = balance_tokens - _cost,
      updated_at = now()
  WHERE user_id = _uid
    AND balance_tokens >= _cost
  RETURNING balance_tokens INTO _new_balance;

  IF _new_balance IS NULL THEN
    RAISE EXCEPTION 'Solde insuffisant (% jetons requis)', _cost;
  END IF;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (_uid, -_cost, 'contact', 'Contact prestataire');

  INSERT INTO public.notifications (user_id, title, content)
  VALUES (_provider_id, 'Nouveau message', COALESCE(_sender_name, 'Un utilisateur') || ' souhaite vous contacter.');

  RETURN jsonb_build_object(
    'ok', true,
    'message_id', _message_id,
    'created_at', _message_created_at,
    'new_balance', _new_balance,
    'cost', _cost
  );
END;
$function$;