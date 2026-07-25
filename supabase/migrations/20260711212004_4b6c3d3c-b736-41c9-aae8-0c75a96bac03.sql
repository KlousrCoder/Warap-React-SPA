INSERT INTO public.app_settings (key, value) VALUES ('token_price_xaf', '50'::jsonb)
  ON CONFLICT (key) DO NOTHING;
INSERT INTO public.app_settings (key, value) VALUES ('fapshi_base_url', to_jsonb('https://sandbox.fapshi.com'::text))
  ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.token_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_amount integer NOT NULL CHECK (token_amount > 0),
  amount_xaf integer NOT NULL CHECK (amount_xaf > 0),
  token_price_xaf integer NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SUCCESSFUL','FAILED','EXPIRED','REFUNDED')),
  fapshi_trans_id text UNIQUE,
  fapshi_payment_link text,
  external_id text UNIQUE,
  provider_payload jsonb,
  credited_at timestamptz,
  wallet_transaction_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_payments_user ON public.token_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_token_payments_status ON public.token_payments(status);
CREATE INDEX IF NOT EXISTS idx_token_payments_trans ON public.token_payments(fapshi_trans_id);

GRANT SELECT ON public.token_payments TO authenticated;
GRANT ALL ON public.token_payments TO service_role;
ALTER TABLE public.token_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own token payments" ON public.token_payments;
CREATE POLICY "Users view own token payments" ON public.token_payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all token payments" ON public.token_payments;
CREATE POLICY "Admins view all token payments" ON public.token_payments
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_token_payments_updated_at ON public.token_payments;
CREATE TRIGGER trg_token_payments_updated_at
  BEFORE UPDATE ON public.token_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.credit_tokens_from_payment(_payment_id uuid, _fapshi_trans_id text, _payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid; _tokens int; _amount int; _status text; _existing_trans uuid; _new_balance int; _tx_id uuid;
BEGIN
  SELECT user_id, token_amount, amount_xaf, status, wallet_transaction_id
    INTO _uid, _tokens, _amount, _status, _existing_trans
    FROM public.token_payments WHERE id = _payment_id FOR UPDATE;
  IF _uid IS NULL THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF _status = 'SUCCESSFUL' AND _existing_trans IS NOT NULL THEN
    SELECT balance_tokens INTO _new_balance FROM public.wallets WHERE user_id = _uid;
    RETURN jsonb_build_object('ok', true, 'already_credited', true, 'new_balance', _new_balance);
  END IF;
  IF _status NOT IN ('PENDING','FAILED','EXPIRED') THEN
    RAISE EXCEPTION 'Payment status not creditable: %', _status;
  END IF;
  UPDATE public.wallets SET balance_tokens = balance_tokens + _tokens, updated_at = now()
    WHERE user_id = _uid RETURNING balance_tokens INTO _new_balance;
  IF _new_balance IS NULL THEN
    INSERT INTO public.wallets (user_id, balance_tokens) VALUES (_uid, _tokens) RETURNING balance_tokens INTO _new_balance;
  END IF;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (_uid, _tokens, 'token_purchase',
      'Achat ' || _tokens || ' jetons (' || _amount || ' XAF) - Fapshi ' || COALESCE(_fapshi_trans_id, ''))
    RETURNING id INTO _tx_id;
  UPDATE public.token_payments
    SET status = 'SUCCESSFUL',
        fapshi_trans_id = COALESCE(fapshi_trans_id, _fapshi_trans_id),
        provider_payload = COALESCE(_payload, provider_payload),
        credited_at = now(),
        wallet_transaction_id = _tx_id,
        updated_at = now()
    WHERE id = _payment_id;
  INSERT INTO public.notifications (user_id, title, content)
    VALUES (_uid, 'Recharge réussie ✅',
      'Votre wallet a été crédité de ' || _tokens || ' jetons (' || _amount || ' XAF).');
  RETURN jsonb_build_object('ok', true, 'already_credited', false, 'new_balance', _new_balance, 'tokens', _tokens);
END; $$;

REVOKE ALL ON FUNCTION public.credit_tokens_from_payment(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_tokens_from_payment(uuid, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_payment_status(_payment_id uuid, _status text, _payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF _status NOT IN ('FAILED','EXPIRED','PENDING') THEN
    RAISE EXCEPTION 'Invalid status: %', _status;
  END IF;
  UPDATE public.token_payments
    SET status = _status, provider_payload = COALESCE(_payload, provider_payload), updated_at = now()
    WHERE id = _payment_id AND status = 'PENDING';
  RETURN jsonb_build_object('ok', true);
END; $$;

REVOKE ALL ON FUNCTION public.mark_payment_status(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_payment_status(uuid, text, jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.recharge_wallet(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recharge_wallet(integer) TO service_role;