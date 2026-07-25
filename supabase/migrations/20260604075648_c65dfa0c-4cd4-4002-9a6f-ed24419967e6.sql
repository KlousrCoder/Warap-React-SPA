
CREATE OR REPLACE FUNCTION public.can_message(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_admin(_a) OR public.is_admin(_b)
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE (p.client_id = _a AND p.selected_provider_id = _b)
         OR (p.client_id = _b AND p.selected_provider_id = _a)
    )
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE (m.sender_id = _a AND m.receiver_id = _b)
         OR (m.sender_id = _b AND m.receiver_id = _a)
    )
$$;

CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE(contact_id uuid, full_name text, name text, avatar_url text, is_admin boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  admins AS (SELECT user_id FROM public.user_roles WHERE role = 'admin'),
  rels AS (
    SELECT p.selected_provider_id AS contact
      FROM public.projects p, me
      WHERE p.client_id = me.uid AND p.selected_provider_id IS NOT NULL
    UNION
    SELECT p.client_id
      FROM public.projects p, me
      WHERE p.selected_provider_id = me.uid
    UNION
    SELECT a.user_id
      FROM admins a, me
      WHERE a.user_id <> me.uid
    UNION
    SELECT CASE WHEN m.sender_id = me.uid THEN m.receiver_id ELSE m.sender_id END
      FROM public.messages m, me
      WHERE m.sender_id = me.uid OR m.receiver_id = me.uid
  )
  SELECT DISTINCT pr.id, pr.full_name, pr.name, pr.avatar_url,
         EXISTS(SELECT 1 FROM admins a WHERE a.user_id = pr.id) AS is_admin
  FROM rels r JOIN public.profiles pr ON pr.id = r.contact
  WHERE r.contact IS NOT NULL AND r.contact <> auth.uid();
$$;
