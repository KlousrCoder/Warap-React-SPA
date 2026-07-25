import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BellOff, CheckCheck, ShieldCheck, MessageCircle, Wallet, AlertTriangle, Eye, Info } from "lucide-react";
import { toast } from "sonner";

function getNotificationStyle(title: string) {
  const t = title.toLowerCase();
  if (t.includes("kyc") || t.includes("valid") || t.includes("approuv") || t.includes("identit")) {
    return { bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800", bar: "bg-emerald-500", icon: ShieldCheck, iconColor: "text-emerald-600 dark:text-emerald-400" };
  }
  if (t.includes("message") || t.includes("conversation") || t.includes("nouveau message") || t.includes("contact")) {
    return { bg: "bg-sky-50 dark:bg-sky-950/20", border: "border-sky-200 dark:border-sky-800", bar: "bg-sky-500", icon: MessageCircle, iconColor: "text-sky-600 dark:text-sky-400" };
  }
  if (t.includes("paiement") || t.includes("portefeuille") || t.includes("solde") || t.includes("jeton") || t.includes("recharge")) {
    return { bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", bar: "bg-amber-500", icon: Wallet, iconColor: "text-amber-600 dark:text-amber-400" };
  }
  if (t.includes("suspendu") || t.includes("rejet") || t.includes("erreur") || t.includes("alerte") || t.includes("refus")) {
    return { bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-800", bar: "bg-red-500", icon: AlertTriangle, iconColor: "text-red-600 dark:text-red-400" };
  }
  if (t.includes("visibilit") || t.includes("publi") || t.includes("profil") || t.includes("apparaitre")) {
    return { bg: "bg-violet-50 dark:bg-violet-950/20", border: "border-violet-200 dark:border-violet-800", bar: "bg-violet-500", icon: Eye, iconColor: "text-violet-600 dark:text-violet-400" };
  }
  return { bg: "bg-card", border: "border-border", bar: "bg-primary", icon: Info, iconColor: "text-primary" };
}

function inferLink(title: string, content: string | null, role: string | null): string {
  const t = (title + " " + (content ?? "")).toLowerCase();
  const isProvider = role === "provider";
  const isAdmin = role === "admin";
  if (t.includes("message") || t.includes("conversation") || t.includes("contact")) return "/messages";
  if (t.includes("kyc") || t.includes("identit") || t.includes("pièce") || t.includes("piece")) return isProvider ? "/dashboard/provider/kyc" : "/dashboard/client";
  if (t.includes("diplôme") || t.includes("diplome") || t.includes("réalisation") || t.includes("realisation") || t.includes("portfolio") || t.includes("portofolio")) return "/dashboard/provider/portfolio";
  if (t.includes("candidature") || t.includes("postul") || t.includes("boost")) return isProvider ? "/dashboard/provider/projects" : "/dashboard/client/projects";
  if (t.includes("offre") || t.includes("projet") || t.includes("mission")) return isProvider ? "/dashboard/provider/projects" : "/dashboard/client/projects";
  if (t.includes("paiement") || t.includes("portefeuille") || t.includes("solde") || t.includes("jeton") || t.includes("recharge") || t.includes("remboursement")) return isProvider ? "/dashboard/provider" : "/dashboard/client";
  if (t.includes("visibilit") || t.includes("publi") || t.includes("profil")) return isProvider ? "/dashboard/provider" : "/profile";
  if (t.includes("service") || t.includes("job")) return isProvider ? "/dashboard/provider/services" : "/services";
  return isAdmin ? "/dashboard/admin" : isProvider ? "/dashboard/provider" : "/dashboard/client";
}

type Notification = { id: string; title: string; content: string | null; read: boolean; created_at: string; link: string | null };

export function NotificationsPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [loading, user, navigate]);

  const load = async () => {
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setNotifs((data ?? []) as Notification[]);
    setBusy(false);
  };

  useEffect(() => { if (user?.id) load(); }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifs-page-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifs((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifs((p) => p.map((n) => ({ ...n, read: true })));
  };

  const dashboardPath = role === "provider" ? "/dashboard/provider" : role === "admin" ? "/dashboard/admin" : "/dashboard/client";
  const unread = notifs.filter((n) => !n.read).length;

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <Link to={dashboardPath} className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour au tableau de bord
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground">{unread > 0 ? `${unread} non lue(s)` : "Tout est à jour."}</p>
          </div>
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="mr-1.5 h-4 w-4" /> Tout marquer lu
            </Button>
          )}
        </div>

        <div className="mt-6 space-y-2">
          {busy ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Chargement…</div>
          ) : notifs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
              <BellOff className="mx-auto mb-2 h-8 w-8" />
              Aucune notification.
            </div>
          ) : (
            notifs.map((n) => {
              const style = getNotificationStyle(n.title);
              const Icon = style.icon;
              return (
                <button
                  key={n.id}
                  onClick={async () => {
                    if (!n.read) await markRead(n.id);
                    const dest = n.link || inferLink(n.title, n.content, role);
                    navigate(dest);
                  }}
                  className={`relative flex w-full items-start justify-between gap-3 rounded-xl border ${style.border} ${style.bg} p-4 text-left transition-colors hover:brightness-[0.98] dark:hover:brightness-110 ${!n.read ? "ring-1 ring-primary/10" : ""}`}
                >
                  <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${style.bar}`} />
                  <div className="ml-3 min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-semibold">
                      <Icon className={`h-4 w-4 shrink-0 ${style.iconColor}`} />
                      {n.title}
                    </div>
                    {n.content && <div className="mt-0.5 text-sm text-muted-foreground">{n.content}</div>}
                    <div className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-FR")}</div>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </button>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
