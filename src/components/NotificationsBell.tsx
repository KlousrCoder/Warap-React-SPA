import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";

export function NotificationsBell() {
  const { user, isAuthenticated } = useAuth();
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setUnread(count ?? 0);
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    load();
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif-bell-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, user?.id, load]);

  if (!isAuthenticated) return null;

  return (
    <Link
      to="/notifications"
      aria-label="Notifications"
      className="relative grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
          {unread > 9 ? "9+" : unread}
        </Badge>
      )}
    </Link>
  );
}
