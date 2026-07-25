
-- =========================================================
-- 1. PROFILES: hide email/phone from public reads
-- =========================================================
DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;

-- Public view exposing only safe columns
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, name, full_name, avatar_url, bio, city, suspended,
       provider_category, is_published, published_at, published_until,
       kyc_status, visibility_status, visibility_until, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Owner/admin keep full row access via existing policies.
-- Add a SELECT policy for authenticated users to read non-sensitive fields of other profiles
-- via the profiles table is intentionally NOT added; use public_profiles for that.

-- RPC for owner to fetch own full profile (including email/phone)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.profiles WHERE id = auth.uid() $$;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- =========================================================
-- 2. NOTIFICATIONS: restrict client inserts
-- =========================================================
DROP POLICY IF EXISTS "Authenticated can create notifications" ON public.notifications;

CREATE POLICY "Users create own notifications or admins"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Trigger to notify receiver on new message (replaces client-side insert)
CREATE OR REPLACE FUNCTION public.notify_message_receiver()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _sender_name text;
BEGIN
  SELECT COALESCE(full_name, name, 'Quelqu''un') INTO _sender_name
    FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, title, content)
    VALUES (NEW.receiver_id, 'Nouveau message de ' || _sender_name, left(NEW.content, 80));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_message_receiver() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_message_receiver ON public.messages;
CREATE TRIGGER trg_notify_message_receiver
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_message_receiver();

-- =========================================================
-- 3. APPLICATIONS: explicit INSERT policy
-- =========================================================
CREATE POLICY "Prestataire creates own application"
ON public.applications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = prestataire_id);

-- =========================================================
-- 4. REALTIME authorization (messages & wallets)
-- =========================================================
-- Restrict realtime.messages so users can only subscribe to their own topics.
-- Convention: clients must subscribe to topics in the form:
--   messages:<uid_a>:<uid_b>  (sorted-or-any pair containing auth.uid())
--   wallet:<uid>              (their own wallet)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth user own message topics" ON realtime.messages;
CREATE POLICY "Auth user own message topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'messages:%' || (auth.uid())::text || '%'
  OR realtime.topic() LIKE 'notif-bell-' || (auth.uid())::text || '%'
  OR realtime.topic() LIKE 'notifs-page-' || (auth.uid())::text || '%'
  OR realtime.topic() = 'wallet:' || (auth.uid())::text
);

-- =========================================================
-- 5. STORAGE: disable public bucket listing (public URLs still work)
-- =========================================================
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read portfolio" ON storage.objects;

-- =========================================================
-- 6. SECURITY DEFINER function EXECUTE hardening
-- =========================================================
-- Internal-only (triggers / used inside other defs): no client access
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_message(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_kyc_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provider_is_visible(uuid) FROM PUBLIC, anon;

-- User-facing RPCs: restrict to authenticated only (no anon)
REVOKE ALL ON FUNCTION public.recharge_wallet(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recharge_wallet(integer) TO authenticated;

REVOKE ALL ON FUNCTION public.contact_provider(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contact_provider(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.apply_to_project(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_to_project(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.boost_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.boost_application(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.complete_provider_onboarding(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_provider_onboarding(text) TO authenticated;

REVOKE ALL ON FUNCTION public.activate_visibility() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_visibility() TO authenticated;

REVOKE ALL ON FUNCTION public.publish_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_profile() TO authenticated;

REVOKE ALL ON FUNCTION public.select_provider(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.select_provider(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.refund_selection(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_selection(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;

REVOKE ALL ON FUNCTION public.get_project_application_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_application_stats() TO authenticated;

-- get_marketplace_services intentionally callable anonymously for public browse
REVOKE ALL ON FUNCTION public.get_marketplace_services(text, text, numeric, numeric, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_marketplace_services(text, text, numeric, numeric, numeric, text) TO anon, authenticated;
