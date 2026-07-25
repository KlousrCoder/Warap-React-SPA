
CREATE OR REPLACE FUNCTION public.get_project_application_stats()
RETURNS TABLE(project_id uuid, total_count integer, my_position integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH ranked AS (
    SELECT a.project_id, a.prestataire_id,
           row_number() OVER (PARTITION BY a.project_id ORDER BY a.created_at ASC)::int AS pos
    FROM public.applications a
  )
  SELECT p.id AS project_id,
         COALESCE((SELECT count(*)::int FROM public.applications a2 WHERE a2.project_id = p.id), 0) AS total_count,
         (SELECT r.pos FROM ranked r WHERE r.project_id = p.id AND r.prestataire_id = auth.uid()) AS my_position
  FROM public.projects p
  WHERE p.status = 'open';
$$;

GRANT EXECUTE ON FUNCTION public.get_project_application_stats() TO authenticated;
