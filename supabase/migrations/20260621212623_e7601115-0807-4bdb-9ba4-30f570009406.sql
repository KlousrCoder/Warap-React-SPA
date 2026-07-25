
INSERT INTO public.app_settings(key, value) VALUES ('project_post_cost', '10')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION public.create_project(_title text, _description text, _budget numeric, _city text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _cost int; _balance int; _id uuid; _is_client boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _title IS NULL OR length(trim(_title)) < 3 THEN RAISE EXCEPTION 'Titre requis'; END IF;
  IF _description IS NULL OR length(trim(_description)) < 10 THEN RAISE EXCEPTION 'Description trop courte'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role IN ('client','admin')) INTO _is_client;
  IF NOT _is_client THEN RAISE EXCEPTION 'Seuls les clients peuvent publier une offre'; END IF;
  SELECT (value)::int INTO _cost FROM public.app_settings WHERE key = 'project_post_cost';
  IF _cost IS NULL THEN _cost := 10; END IF;
  SELECT balance_tokens INTO _balance FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _balance IS NULL OR _balance < _cost THEN RAISE EXCEPTION 'Solde insuffisant (% jetons requis)', _cost; END IF;
  UPDATE public.wallets SET balance_tokens = balance_tokens - _cost, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.projects (client_id, title, description, budget, city, status)
    VALUES (_uid, _title, _description, _budget, _city, 'open') RETURNING id INTO _id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (_uid, -_cost, 'project_post', 'Publication offre: ' || _title);
  INSERT INTO public.notifications (user_id, title, content)
    VALUES (_uid, 'Offre publiée', 'Votre offre « ' || _title || ' » est en ligne.');
  RETURN jsonb_build_object('project_id', _id, 'new_balance', _balance - _cost, 'cost', _cost);
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_project(_project_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _client uuid; _status text; _selected uuid;
  _app_count int; _cost int; _refund int := 0; _title text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT client_id, status, selected_provider_id, title INTO _client, _status, _selected, _title
    FROM public.projects WHERE id = _project_id FOR UPDATE;
  IF _client IS NULL THEN RAISE EXCEPTION 'Projet introuvable'; END IF;
  IF _client <> _uid THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  IF _selected IS NOT NULL THEN RAISE EXCEPTION 'Un prestataire est déjà sélectionné'; END IF;
  IF _status = 'cancelled' THEN RAISE EXCEPTION 'Offre déjà annulée'; END IF;
  SELECT count(*) INTO _app_count FROM public.applications WHERE project_id = _project_id;
  IF _app_count = 0 THEN
    SELECT (value)::int INTO _cost FROM public.app_settings WHERE key = 'project_post_cost';
    IF _cost IS NULL THEN _cost := 10; END IF;
    _refund := _cost;
    UPDATE public.wallets SET balance_tokens = balance_tokens + _refund, updated_at = now() WHERE user_id = _uid;
    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
      VALUES (_uid, _refund, 'project_refund', 'Remboursement offre annulée: ' || COALESCE(_title,''));
  END IF;
  UPDATE public.projects SET status = 'cancelled' WHERE id = _project_id;
  RETURN jsonb_build_object('ok', true, 'refund', _refund);
END; $$;

CREATE OR REPLACE FUNCTION public.get_open_projects()
RETURNS TABLE(
  id uuid, title text, description text, budget numeric, city text, created_at timestamptz,
  client_id uuid, client_name text, client_avatar text,
  application_count int, max_applications int, my_rank int, has_applied boolean
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH max_cfg AS (
    SELECT COALESCE((SELECT (value)::int FROM public.app_settings WHERE key = 'max_applications_per_project'), 5) AS m
  ),
  ranked AS (
    SELECT a.project_id, a.prestataire_id,
      row_number() OVER (PARTITION BY a.project_id ORDER BY a.boost_count DESC, a.created_at ASC)::int AS pos
    FROM public.applications a
  )
  SELECT p.id, p.title, p.description, p.budget, p.city, p.created_at,
         p.client_id, COALESCE(pr.full_name, pr.name, 'Client'), pr.avatar_url,
         COALESCE((SELECT count(*)::int FROM public.applications a2 WHERE a2.project_id = p.id), 0),
         (SELECT m FROM max_cfg),
         (SELECT r.pos FROM ranked r WHERE r.project_id = p.id AND r.prestataire_id = auth.uid()),
         EXISTS(SELECT 1 FROM public.applications a3 WHERE a3.project_id = p.id AND a3.prestataire_id = auth.uid())
  FROM public.projects p
  LEFT JOIN public.profiles pr ON pr.id = p.client_id
  WHERE p.status = 'open'
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_my_project_applications(_project_id uuid)
RETURNS TABLE(
  id uuid, project_id uuid, prestataire_id uuid, cover_letter text,
  boost_count int, status text, created_at timestamptz, rank int,
  provider_name text, provider_avatar text, provider_city text, provider_category text,
  provider_rating numeric, provider_reviews int
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH owner_check AS (
    SELECT 1 FROM public.projects WHERE id = _project_id AND (client_id = auth.uid() OR public.is_admin(auth.uid()))
  ),
  ranked AS (
    SELECT a.id, a.project_id, a.prestataire_id, a.cover_letter, a.boost_count, a.status, a.created_at,
      row_number() OVER (ORDER BY a.boost_count DESC, a.created_at ASC)::int AS pos
    FROM public.applications a WHERE a.project_id = _project_id
  )
  SELECT r.id, r.project_id, r.prestataire_id, r.cover_letter,
         r.boost_count, r.status, r.created_at, r.pos,
         COALESCE(p.full_name, p.name, 'Prestataire'), p.avatar_url, p.city, p.provider_category,
         COALESCE((SELECT round(avg(rv.rating)::numeric,2) FROM public.reviews rv WHERE rv.provider_id = r.prestataire_id), 0),
         COALESCE((SELECT count(*)::int FROM public.reviews rv WHERE rv.provider_id = r.prestataire_id), 0)
  FROM ranked r
  LEFT JOIN public.profiles p ON p.id = r.prestataire_id
  WHERE EXISTS (SELECT 1 FROM owner_check)
  ORDER BY r.pos;
$$;

GRANT EXECUTE ON FUNCTION public.create_project(text, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_open_projects() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_project_applications(uuid) TO authenticated;
