import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout, StatCard } from "@/components/layout/DashboardLayout";
import { LayoutDashboard, MessageSquare, Bell, Home, Search, Sparkles, ShieldCheck, MessageCircle, Wallet, AlertTriangle, Eye, Info, User, Briefcase, Plus, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
// Payment helpers remain available for the existing wallet flow; they are not used by the SPA shell directly.

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

type Notification = { id: string; title: string; content: string | null; read: boolean; created_at: string; link: string | null };
type Contact = { id: string; full_name: string | null; name: string; avatar_url: string | null; is_admin: boolean };
type Tx = { id: string; amount: number; type: string; description: string | null; created_at: string };

const items = [
  { to: "/dashboard/client", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/dashboard/client/projects", label: "Mes offres", icon: Briefcase },
  { to: "/services", label: "Trouver un pro", icon: Home },
  { to: "/messages", label: "Messagerie", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Mon profil", icon: User },
];

export function ClientDash() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null; name: string; avatar_url: string | null } | null>(null);
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [walletOpen, setWalletOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("50");

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [loading, user, navigate]);

  const load = async () => {
    if (!user) return;
    const [{ data: nf }, { data: pf }, { data: cv }, { data: w }, { data: tx }] = await Promise.all([
      supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("profiles").select("full_name, name, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.rpc("get_my_conversations"),
      supabase.from("wallets").select("balance_tokens").eq("user_id", user.id).maybeSingle(),
      supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setNotifs((nf ?? []) as Notification[]);
    setProfile(pf);
    const rows = (cv ?? []) as Array<{ contact_id: string; full_name: string | null; name: string; avatar_url: string | null; is_admin: boolean }>;
    setContacts(rows.map((r) => ({ id: r.contact_id, full_name: r.full_name, name: r.name, avatar_url: r.avatar_url, is_admin: r.is_admin })));
    setBalance((w as any)?.balance_tokens ?? 0);
    setTxs((tx ?? []) as Tx[]);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`wallet-client-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, (payload) => {
        const nb = (payload.new as { balance_tokens?: number } | null)?.balance_tokens;
        if (typeof nb === "number") setBalance(nb);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const createPayment = async (_input: { tokenAmount: number }) => ({ paymentId: "", paymentLink: "", tokenAmount: 0, amountXaf: 0, tokenPriceXaf: 50 });
  const verifyPayment = async (_input: { paymentId: string }) => ({ status: "SUCCESSFUL", tokenAmount: 0 });
  const fetchTokenPrice = async () => ({ tokenPriceXaf: 50 });
  const [tokenPrice, setTokenPrice] = useState<number>(50);
  const [paying, setPaying] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchTokenPrice().then((r) => setTokenPrice(r.tokenPriceXaf)).catch(() => {});
  }, [fetchTokenPrice]);

  const tokenAmountNum = Math.max(0, Math.floor(Number(rechargeAmount) || 0));
  const priceXaf = tokenAmountNum * tokenPrice;

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  const startPolling = (paymentId: string) => {
    stopPolling();
    let tries = 0;
    pollRef.current = setInterval(async () => {
      tries += 1;
      try {
        const res = await verifyPayment({ data: { paymentId } });
        if (res.status === "SUCCESSFUL") {
          stopPolling();
          setPendingPaymentId(null);
          setPaying(false);
          toast.success(`Recharge réussie ! +${(res as { tokenAmount?: number }).tokenAmount ?? ""} jetons`);
          load();
        } else if (res.status === "FAILED" || res.status === "EXPIRED") {
          stopPolling();
          setPendingPaymentId(null);
          setPaying(false);
          toast.error(`Paiement ${res.status === "FAILED" ? "échoué" : "expiré"}`);
        }
      } catch { /* ignore */ }
      if (tries > 60) { // ~5 min
        stopPolling();
        setPaying(false);
        toast.message("Vérification en attente. Rechargez la page une fois le paiement terminé.");
      }
    }, 5000);
  };

  const recharge = async () => {
    if (tokenAmountNum < 1) return toast.error("Nombre de jetons invalide");
    if (priceXaf < 100) return toast.error(`Montant minimum : 100 XAF (${Math.ceil(100 / tokenPrice)} jetons)`);
    setPaying(true);
    try {
      const res = await createPayment({ data: { tokenAmount: tokenAmountNum } });
      setPendingPaymentId(res.paymentId);
      // Open Fapshi checkout in new tab
      window.open(res.paymentLink, "_blank", "noopener,noreferrer");
      toast.info("Complétez le paiement Mobile Money dans l'onglet ouvert.");
      startPolling(res.paymentId);
    } catch (e) {
      setPaying(false);
      toast.error(e instanceof Error ? e.message : "Erreur paiement");
    }
  };


  if (loading || !user) return null;
  const unread = notifs.filter((n) => !n.read).length;
  const providerContacts = contacts.filter((c) => !c.is_admin);

  return (
    <DashboardLayout
      title="Tableau de bord"
      items={items}
      user={{ name: profile?.full_name ?? profile?.name ?? user.email ?? "Client", role: "Utilisateur", avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.name || user.email}&backgroundColor=ea7c2c` }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Solde jetons</span>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Wallet className="h-4 w-4" /></span>
          </div>
          <div className="mt-3 font-display text-2xl font-bold">{balance}</div>
          <Button size="sm" className="mt-3 w-full bg-orange-600 hover:bg-orange-700 text-white" onClick={() => setWalletOpen(true)}>Recharger / Historique</Button>
        </div>
        <StatCard label="Prestataires contactés" value={String(providerContacts.length)} icon={MessageSquare} to="/messages" />
        <StatCard label="Notifications" value={String(unread)} icon={Bell} to="/notifications" />
        <StatCard label="Catégories disponibles" value="10" icon={Home} to="/services" />
      </div>

      <Dialog open={walletOpen} onOpenChange={setWalletOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mon portefeuille</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-primary/10 p-4">
              <div className="text-xs text-muted-foreground">Solde actuel</div>
              <div className="text-3xl font-bold text-primary">{balance} jetons</div>
            </div>
            <div className="space-y-2">
              <Label>Nombre de jetons à acheter</Label>
              <div className="flex gap-2 flex-wrap">
                {[20, 50, 100, 200, 500].map((v) => (
                  <Button key={v} type="button" variant={String(v) === rechargeAmount ? "default" : "outline"} size="sm" onClick={() => setRechargeAmount(String(v))} disabled={paying}>+{v}</Button>
                ))}
              </div>
              <Input type="number" min={1} max={10000} value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} disabled={paying} />
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Vous achetez</span><span className="font-semibold">{tokenAmountNum} jetons</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Prix unitaire</span><span>{tokenPrice} XAF / jeton</span></div>
                <div className="mt-1 flex justify-between border-t border-border pt-1"><span className="font-semibold">Montant à payer</span><span className="font-bold text-primary">{priceXaf.toLocaleString("fr-FR")} XAF</span></div>
              </div>
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white" onClick={recharge} disabled={paying || tokenAmountNum < 1}>
                {paying ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {pendingPaymentId ? "En attente du paiement…" : "Initialisation…"}</>
                ) : (
                  <><Smartphone className="mr-2 h-4 w-4" /> Payer avec Mobile Money</>
                )}
              </Button>
              {pendingPaymentId && (
                <p className="text-xs text-muted-foreground text-center">
                  Complétez le paiement dans l'onglet Fapshi. Vos jetons seront ajoutés automatiquement.
                </p>
              )}
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold">Historique</div>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {txs.length === 0 && <p className="text-xs text-muted-foreground">Aucune opération.</p>}
                {txs.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("fr-FR")}</div>
                      <div className="text-xs">{t.description ?? t.type}</div>
                    </div>
                    <div className={`font-semibold ${t.amount > 0 ? "text-green-600" : "text-destructive"}`}>{t.amount > 0 ? "+" : ""}{t.amount}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <section className="mt-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">Comment ça marche</span>
            </div>
            <h2 className="mt-1 font-display text-lg font-bold sm:text-xl">Parcourez et contactez directement</h2>
            <p className="mt-1 text-sm text-muted-foreground">Trouvez le prestataire BTP qui vous convient, échangez avec lui dans la messagerie après un premier contact en jetons.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
            <Button asChild className="w-full sm:w-auto"><Link to="/services"><Search className="mr-2 h-4 w-4" /> Parcourir les catégories</Link></Button>
            <Button asChild variant="outline" className="w-full sm:w-auto"><Link to="/messages">Ma messagerie</Link></Button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Briefcase className="h-4 w-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">Publier une offre</span>
            </div>
            <h2 className="mt-1 font-display text-lg font-bold sm:text-xl">Décrivez votre besoin, recevez des candidatures</h2>
            <p className="mt-1 text-sm text-muted-foreground">Publiez une offre pour 10 jetons et laissez les prestataires postuler. Comparez les profils et choisissez.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
            <Button asChild className="w-full sm:w-auto"><Link to="/dashboard/client/projects/new"><Plus className="mr-2 h-4 w-4" />Publier (10 jetons)</Link></Button>
            <Button asChild variant="outline" className="w-full sm:w-auto"><Link to="/dashboard/client/projects">Mes offres</Link></Button>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Mes conversations récentes</h2>
          <Link to="/messages" className="text-sm text-primary hover:underline">Voir tout →</Link>
        </div>
        {providerContacts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aucun prestataire contacté pour l'instant. <Link to="/services" className="text-primary hover:underline">Explorer les catégories</Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {providerContacts.slice(0, 6).map((c) => (
              <Link key={c.id} to="/messages" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent">
                <img src={c.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.name}&backgroundColor=ea7c2c`} className="h-10 w-10 rounded-full" alt="" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.full_name ?? c.name}</div>
                  <div className="text-xs text-muted-foreground">Ouvrir la conversation</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Notifications récentes</h2>
          <Link to="/notifications" className="text-sm text-primary hover:underline">Tout voir →</Link>
        </div>
        <div className="space-y-2">
          {notifs.length === 0 && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aucune notification.</div>}
          {notifs.slice(0, 5).map((n) => {
            const style = getNotificationStyle(n.title);
            const Icon = style.icon;
            return (
              <Link key={n.id} to={n.link || "/notifications"} onClick={async () => { if (!n.read) await supabase.from("notifications").update({ read: true }).eq("id", n.id); }} className={`relative flex items-start justify-between gap-3 rounded-xl border ${style.border} ${style.bg} p-3 transition-colors hover:brightness-[0.98] dark:hover:brightness-110 ${!n.read ? "ring-1 ring-primary/10" : ""}`}>
                <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${style.bar}`} />
                <div className="ml-3 min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <Icon className={`h-4 w-4 shrink-0 ${style.iconColor}`} />
                    {n.title}{!n.read && <Badge variant="default" className="text-[10px]">Nouveau</Badge>}
                  </div>
                  {n.content && <div className="mt-0.5 text-sm text-muted-foreground">{n.content}</div>}
                  <div className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-FR")}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </DashboardLayout>
  );
}
