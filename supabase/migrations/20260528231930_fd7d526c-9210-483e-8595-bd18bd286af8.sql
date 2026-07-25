
-- 1. Default category for providers missing one
UPDATE public.profiles p
SET provider_category = 'maconnerie'
WHERE provider_category IS NULL
  AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'provider');

-- 2. boost_count column
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS boost_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_applications_project_rank
  ON public.applications (project_id, boost_count DESC, created_at ASC);

-- 3. Boost cost setting
INSERT INTO public.app_settings (key, value)
VALUES ('application_boost_cost', '5'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. Updated ranking: boost_count DESC, then created_at ASC
CREATE OR REPLACE FUNCTION public.get_project_application_stats()
 RETURNS TABLE(project_id uuid, total_count integer, my_position integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH ranked AS (
    SELECT a.project_id, a.prestataire_id,
           row_number() OVER (
             PARTITION BY a.project_id
             ORDER BY a.boost_count DESC, a.created_at ASC
           )::int AS pos
    FROM public.applications a
  )
  SELECT p.id AS project_id,
         COALESCE((SELECT count(*)::int FROM public.applications a2 WHERE a2.project_id = p.id), 0) AS total_count,
         (SELECT r.pos FROM ranked r WHERE r.project_id = p.id AND r.prestataire_id = auth.uid()) AS my_position
  FROM public.projects p
  WHERE p.status = 'open';
$function$;

-- 5. boost_application RPC
CREATE OR REPLACE FUNCTION public.boost_application(_application_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _cost integer;
  _balance integer;
  _project uuid;
  _title text;
  _new_boost integer;
  _new_position integer;
  _max integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT (value)::int INTO _cost FROM public.app_settings WHERE key = 'application_boost_cost';
  IF _cost IS NULL THEN _cost := 5; END IF;

  SELECT (value)::int INTO _max FROM public.app_settings WHERE key = 'max_applications_per_project';
  IF _max IS NULL THEN _max := 5; END IF;

  SELECT project_id INTO _project FROM public.applications
    WHERE id = _application_id AND prestataire_id = _uid FOR UPDATE;
  IF _project IS NULL THEN RAISE EXCEPTION 'Candidature introuvable'; END IF;

  SELECT title INTO _title FROM public.projects WHERE id = _project;

  SELECT balance_tokens INTO _balance FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _balance IS NULL OR _balance < _cost THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;

  UPDATE public.wallets SET balance_tokens = balance_tokens - _cost, updated_at = now() WHERE user_id = _uid;

  UPDATE public.applications
     SET boost_count = boost_count + 1
   WHERE id = _application_id
   RETURNING boost_count INTO _new_boost;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (_uid, -_cost, 'boost', 'Boost candidature: ' || COALESCE(_title, ''));

  -- Recompute position with new ranking
  SELECT pos INTO _new_position FROM (
    SELECT prestataire_id,
           row_number() OVER (ORDER BY boost_count DESC, created_at ASC)::int AS pos
    FROM public.applications WHERE project_id = _project
  ) r WHERE r.prestataire_id = _uid;

  INSERT INTO public.notifications (user_id, title, content)
    VALUES (_uid, 'Candidature boostée',
      'Vous êtes maintenant classé #' || _new_position || ' sur ' || _max ||
      ' pour: ' || COALESCE(_title, '') ||
      '. Booster ne garantit pas la sélection mais augmente vos chances.');

  RETURN jsonb_build_object(
    'new_balance', _balance - _cost,
    'cost', _cost,
    'boost_count', _new_boost,
    'position', _new_position,
    'max', _max
  );
END;
$function$;
