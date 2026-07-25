
-- App settings (singleton-style key/value)
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings public read" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (key, value) VALUES ('application_token_cost', '5'::jsonb);

-- Wallet transaction history
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Updated apply_to_project: dynamic cost + log transaction
CREATE OR REPLACE FUNCTION public.apply_to_project(_project_id uuid, _cover_letter text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _cost integer;
  _balance integer;
  _client uuid;
  _title text;
  _app_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT (value)::int INTO _cost FROM public.app_settings WHERE key = 'application_token_cost';
  IF _cost IS NULL THEN _cost := 5; END IF;

  SELECT client_id, title INTO _client, _title FROM public.projects WHERE id = _project_id AND status = 'open';
  IF _client IS NULL THEN RAISE EXCEPTION 'Project not available'; END IF;
  IF _client = _uid THEN RAISE EXCEPTION 'Cannot apply to own project'; END IF;
  SELECT balance_tokens INTO _balance FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _balance IS NULL OR _balance < _cost THEN RAISE EXCEPTION 'Insufficient tokens'; END IF;

  UPDATE public.wallets SET balance_tokens = balance_tokens - _cost, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.applications (project_id, prestataire_id, cover_letter, token_cost)
    VALUES (_project_id, _uid, _cover_letter, _cost) RETURNING id INTO _app_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (_uid, -_cost, 'application', 'Candidature: ' || _title);
  INSERT INTO public.notifications (user_id, title, content)
    VALUES (_client, 'Nouvelle candidature', 'Vous avez reçu une candidature pour: ' || _title);
  RETURN jsonb_build_object('application_id', _app_id, 'new_balance', _balance - _cost);
END;
$$;

-- Recharge wallet (mock: instant credit)
CREATE OR REPLACE FUNCTION public.recharge_wallet(_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _new integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 1000 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  UPDATE public.wallets SET balance_tokens = balance_tokens + _amount, updated_at = now()
    WHERE user_id = _uid RETURNING balance_tokens INTO _new;
  IF _new IS NULL THEN
    INSERT INTO public.wallets (user_id, balance_tokens) VALUES (_uid, _amount) RETURNING balance_tokens INTO _new;
  END IF;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (_uid, _amount, 'recharge', 'Recharge de ' || _amount || ' jetons');
  RETURN jsonb_build_object('new_balance', _new);
END;
$$;
