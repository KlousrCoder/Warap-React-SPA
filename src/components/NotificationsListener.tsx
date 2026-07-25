import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

function playChime() {
  try {
    const AC: typeof AudioContext =
      (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const notes = [880, 1320];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    /* no-op */
  }
}

export function NotificationsListener() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const seenIds = useRef<Set<string>>(new Set());
  const permissionAsked = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    if (typeof window === "undefined") return;

    if (
      !permissionAsked.current &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      permissionAsked.current = true;
      Notification.requestPermission().catch(() => {});
    }

    const channel = supabase
      .channel(`notif-listener-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as NotificationRow;
          if (!n || seenIds.current.has(n.id)) return;
          seenIds.current.add(n.id);

          playChime();

          const target = n.link || "/notifications";
          toast(n.title, {
            description: n.content ?? undefined,
            duration: 10000,
            className:
              "cursor-pointer !bg-primary !text-primary-foreground border border-primary/60 ring-2 ring-primary/30 shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.55)]",
            descriptionClassName: "!text-primary-foreground/90",
            
            action: {
              label: "Voir l'offre →",
              onClick: () => navigate(target),
            },
          });



          if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
            try {
              const sysNotif = new Notification(n.title, {
                body: n.content ?? "",
                tag: n.id,
              });
              sysNotif.onclick = () => {
                window.focus();
                if (n.link) navigate(n.link);
                sysNotif.close();
              };
            } catch {
              /* no-op */
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, navigate]);

  return null;
}
