
CREATE OR REPLACE FUNCTION public.send_message(_receiver_id uuid, _content text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _enabled boolean;
  _cost int;
  _new_balance int;
  _message_id uuid;
  _created_at timestamptz;
  _is_admin_sender boolean;
  _is_admin_receiver boolean;
  _charge boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _uid = _receiver_id THEN RAISE EXCEPTION 'Cannot message yourself'; END IF;
  IF _content IS NULL OR length(trim(_content)) = 0 THEN RAISE EXCEPTION 'Message vide'; END IF;
  IF NOT public.can_message(_uid, _receiver_id) THEN
    RAISE EXCEPTION 'Conversation non autorisée';
  END IF;

  SELECT COALESCE((value)::text::boolean, true) INTO _enabled FROM public.app_settings WHERE key = 'message_cost_enabled';
  IF _enabled IS NULL THEN _enabled := true; END IF;
  SELECT (value)::int INTO _cost FROM public.app_settings WHERE key = 'message_token_cost';
  IF _cost IS NULL THEN _cost := 1; END IF;

  SELECT public.is_admin(_uid) INTO _is_admin_sender;
  SELECT public.is_admin(_receiver_id) INTO _is_admin_receiver;
  _charge := _enabled AND NOT _is_admin_sender AND NOT _is_admin_receiver AND _cost > 0;

  INSERT INTO public.messages (sender_id, receiver_id, content)
    VALUES (_uid, _receiver_id, trim(_content))
    RETURNING id, created_at INTO _message_id, _created_at;

  IF _charge THEN
    UPDATE public.wallets
      SET balance_tokens = balance_tokens - _cost, updated_at = now()
      WHERE user_id = _uid AND balance_tokens >= _cost
      RETURNING balance_tokens INTO _new_balance;
    IF _new_balance IS NULL THEN
      RAISE EXCEPTION 'Solde insuffisant (% jetons requis)', _cost;
    END IF;
    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
      VALUES (_uid, -_cost, 'message', 'Envoi de message');
  ELSE
    SELECT balance_tokens INTO _new_balance FROM public.wallets WHERE user_id = _uid;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'message_id', _message_id,
    'created_at', _created_at,
    'new_balance', _new_balance,
    'cost', CASE WHEN _charge THEN _cost ELSE 0 END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_message(uuid, text) TO authenticated;
