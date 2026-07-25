import { useNavigate, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { createTokenPayment, verifyTokenPayment, getTokenPriceFn } from "@/lib/token-payments.functions";
import { Loader2, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout, StatCard } from "@/components/layout/DashboardLayout";
import { LayoutDashboard, Wallet, Image as ImageIcon, MessageSquare, Bell, Plus, Trash2, ShieldCheck, ShieldAlert, Shield, Eye, EyeOff, Sparkles, Wrench, FolderKanban, FileCheck, MessageCircle, AlertTriangle, Info, CheckCircle2, Circle, User, Briefcase } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { categories } from "@/lib/mock-data";

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

type Service = { id: string; title: string; description: string | null; price: number | null; category: string | null };
type Portfolio = { id: string; title: string; description: string | null; image_url: string | null; category: string | null; completed_at: string | null; location: string | null };
type Notification = { id: string; title: string; content: string | null; read: boolean; created_at: string; link: string | null };
type Kyc = { id: string; status: string; document_url: string; document_path: string; notes: string | null; created_at: string };
type Tx = { id: string; amount: number; type: string; description: string | null; created_at: string };
type ProviderProfile = { id: string; full_name: string | null; name: string; avatar_url: string | null; bio: string | null; city: string | null; provider_category: string | null; is_published: boolean; published_at: string | null; published_until: string | null };

const items = [
  { to: "/dashboard/provider", label: "Tableau de bord", icon: LayoutDashboard },
  
  { to: "/dashboard/provider/portfolio", label: "Portfolio", icon: FolderKanban },
  { to: "/dashboard/provider/projects", label: "Marketplace", icon: Briefcase },
  { to: "/dashboard/provider/kyc", label: "KYC", icon: FileCheck },
  { to: "/messages", label: "Messagerie", icon: MessageSquare },
  { to: "/profile", label: "Mon profil", icon: User },
];

export function ProviderDash() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [kyc, setKyc] = useState<Kyc | null>(null);
  const [kycUploading, setKycUploading] = useState(false);
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [publishCost, setPublishCost] = useState(20);
  const [publishDays, setPublishDays] = useState(30);
  const [publishing, setPublishing] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("50");

  const [svcOpen, setSvcOpen] = useState(false);
  const [svcForm, setSvcForm] = useState({ title: "", description: "", price: "", category: "" });

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [loading, user, navigate]);

  const load = async () => {
    if (!user) return;
    const { data: walletRow } = await supabase.from("wallets").select("balance_tokens").eq("user_id", user.id).maybeSingle();
    setBalance(walletRow?.balance_tokens ?? 0);

    const [{ data: sv }, { data: pf }, { data: nf }, { data: pr }, { data: kc }, { data: stCost }, { data: stDays }, { data: tx }] = await Promise.all([
      supabase.from("services").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("portfolio").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("profiles").select("id,full_name,name,avatar_url,bio,city,provider_category,is_published,published_at,published_until").eq("id", user.id).maybeSingle(),
      supabase.from("kyc_submissions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "profile_publish_cost").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "profile_publish_duration_days").maybeSingle(),
      supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setServices((sv ?? []) as Service[]);
    setPortfolio((pf ?? []) as Portfolio[]);
    setNotifs((nf ?? []) as Notification[]);
    setProfile(pr as ProviderProfile);
    setKyc((kc as Kyc) ?? null);
    if (stCost?.value != null) setPublishCost(Number(stCost.value));
    if (stDays?.value != null) setPublishDays(Number(stDays.value));
    setTxs((tx ?? []) as Tx[]);
  };

  useEffect(() => { if (user?.id) load(); }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, (payload) => {
        const nb = (payload.new as { balance_tokens?: number } | null)?.balance_tokens;
        if (typeof nb === "number") setBalance(nb);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const createPayment = async (payload: { data: { tokenAmount: number } }) => {
    if (!user?.id) throw new Error("Authentification requise");
    return createTokenPayment({ data: payload.data, userId: user.id });
  };
  const verifyPayment = async (payload: { data: { paymentId: string } }) => {
    if (!user?.id) throw new Error("Authentification requise");
    return verifyTokenPayment({ data: payload.data, userId: user.id });
  };
  const fetchTokenPrice = async () => getTokenPriceFn();
  const [tokenPrice, setTokenPrice] = useState<number>(50);
  const [paying, setPaying] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => { fetchTokenPrice().then((r) => setTokenPrice(r.tokenPriceXaf)).catch(() => {}); }, []);
  const tokenAmountNum = Math.max(0, Math.floor(Number(rechargeAmount) || 0));
  const priceXaf = tokenAmountNum * tokenPrice;
  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  useEffect(() => () => stopPolling(), []);
  const startPolling = (paymentId: string) => {
    stopPolling();
    let tries = 0;
    pollRef.current = setInterval(async () => {
      tries += 1;
      try {
        const res = await verifyPayment({ data: { paymentId } });
        if (res.status === "SUCCESSFUL") {
          stopPolling(); setPendingPaymentId(null); setPaying(false);
          toast.success(`Recharge réussie ! +${(res as { tokenAmount?: number }).tokenAmount ?? ""} jetons`);
          load();
        } else if (res.status === "FAILED" || res.status === "EXPIRED") {
          stopPolling(); setPendingPaymentId(null); setPaying(false);
          toast.error(`Paiement ${res.status === "FAILED" ? "échoué" : "expiré"}`);
        }
      } catch { /* ignore */ }
      if (tries > 60) { stopPolling(); setPaying(false); toast.message("Vérification en attente."); }
    }, 5000);
  };
  const recharge = async () => {
    if (tokenAmountNum < 1) return toast.error("Nombre de jetons invalide");
    if (priceXaf < 100) return toast.error(`Montant minimum : 100 XAF (${Math.ceil(100 / tokenPrice)} jetons)`);
    setPaying(true);
    try {
      const res = await createPayment({ data: { tokenAmount: tokenAmountNum } });
      setPendingPaymentId(res.paymentId);
      window.open(res.paymentLink, "_blank", "noopener,noreferrer");
      toast.info("Complétez le paiement Mobile Money dans l'onglet ouvert.");
      startPolling(res.paymentId);
    } catch (e) {
      setPaying(false);
      toast.error(e instanceof Error ? e.message : "Erreur paiement");
    }
  };

  const publishProfile = async () => {
    if (!kycApproved) { toast.error("Validez votre KYC avant d'activer votre visibilité"); return; }
    if (balance < publishCost) { toast.error("Solde insuffisant"); return; }
    setPublishing(true);
    const { error } = await supabase.rpc("activate_visibility" as never);
    setPublishing(false);
    if (error) { toast.error((error as { message?: string }).message ?? "Erreur"); return; }
    toast.success(`Visibilité activée pour ${publishDays} jours`);
    load();
  };

  const selectKycFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setKycFile(file);
  };

  const submitKyc = async () => {
    if (!kycFile || !user) return;
    setKycUploading(true);
    const path = `${user.id}/id-${Date.now()}.${kycFile.name.split(".").pop()}`;
    const { error: upErr } = await supabase.storage.from("kyc").upload(path, kycFile, { upsert: true });
    if (upErr) { setKycUploading(false); return toast.error("Échec de l'envoi : " + upErr.message); }
    const { data: signed, error: signErr } = await supabase.storage.from("kyc").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signed?.signedUrl) { setKycUploading(false); return toast.error("Échec : impossible de générer le lien"); }
    const url = signed.signedUrl;
    const { error: dbErr } = kyc
      ? await supabase.from("kyc_submissions").update({ document_url: url, document_path: path, status: "pending", notes: null }).eq("id", kyc.id)
      : await supabase.from("kyc_submissions").insert({ user_id: user.id, document_url: url, document_path: path });
    setKycUploading(false);
    if (dbErr) return toast.error("Échec : " + dbErr.message);
    setKycFile(null);
    toast.success("Pièce envoyée. En attente de validation.");
    load();
  };

  const submitService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("services").insert({
      user_id: user.id, title: svcForm.title, description: svcForm.description || null,
      price: svcForm.price ? Number(svcForm.price) : null, category: svcForm.category || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Service ajouté"); setSvcOpen(false); setSvcForm({ title: "", description: "", price: "", category: "" }); load();
  };

  const removeService = async (id: string) => {
    if (!confirm("Supprimer ce service ?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (!error) { toast.success("Supprimé"); load(); } else toast.error(error.message);
  };


  if (loading || !user) return null;
  const unread = notifs.filter((n) => !n.read).length;
  const isPublished = profile?.is_published && profile.published_until && new Date(profile.published_until) > new Date();
  const expiresIn = profile?.published_until ? Math.max(0, Math.ceil((new Date(profile.published_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  const kycApproved = kyc?.status === "approved";

  return (
    <DashboardLayout
      title="Espace prestataire"
      items={items}
      hideSearch
      user={{ name: profile?.full_name ?? profile?.name ?? user.email ?? "Prestataire", role: "Prestataire", avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.name || user.email}&backgroundColor=ea7c2c` }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Solde jetons</span>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Wallet className="h-4 w-4" /></span>
          </div>
          <div className="mt-3 font-display text-2xl font-bold">{balance}</div>
          <Button size="sm" className="mt-3 w-full bg-orange-600 hover:bg-orange-700 text-white" onClick={() => setRechargeOpen(true)}>Consulter</Button>
        </div>
        
        <StatCard label="Réalisations" value={String(portfolio.length)} icon={ImageIcon} to="/dashboard/provider/portfolio" />
        <StatCard label="Notifications" value={String(unread)} icon={Bell} to="/notifications" />
      </div>

      {/* Jauge de complétion du profil */}
      {(() => {
        const checks = [
          { label: "Nom complet renseigné", done: !!(profile?.full_name && profile.full_name.trim().length > 1), link: "/dashboard/provider" as const },
          { label: "Photo de profil ajoutée", done: !!profile?.avatar_url, link: "/dashboard/provider" as const },
          { label: "Bio renseignée", done: !!(profile?.bio && profile.bio.trim().length >= 10), link: "/dashboard/provider" as const },
          { label: "Ville renseignée", done: !!(profile?.city && profile.city.trim().length > 1), link: "/dashboard/provider" as const },
          { label: "Pièce d'identité (KYC) validée", done: kyc?.status === "approved", link: "/dashboard/provider/kyc" as const },
          
        ];
        const doneCount = checks.filter((c) => c.done).length;
        const pct = Math.round((doneCount / checks.length) * 100);
        const color = pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-orange-500" : "bg-amber-500";
        return (
          <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-display text-lg font-bold">Complétion de votre profil</h2>
                <p className="text-sm text-muted-foreground">Un profil complet inspire confiance et augmente vos chances d'être contacté.</p>
              </div>
              <div className="text-right">
                <div className="font-display text-3xl font-bold">{pct}%</div>
                <div className="text-xs text-muted-foreground">{doneCount}/{checks.length} étapes</div>
              </div>
            </div>
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {checks.map((c) => (
                <li key={c.label}>
                  <Link to={c.link} className={`flex items-center gap-2 rounded-md border p-2 text-sm transition-colors ${c.done ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300" : "border-border bg-muted/30 hover:bg-muted/50"}`}>
                    {c.done ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    <span className={c.done ? "line-through opacity-80" : ""}>{c.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      {/* Publication du profil */}
      <section className={`mt-6 rounded-2xl border p-5 shadow-[var(--shadow-card)] sm:p-6 ${isPublished ? "border-green-600/30 bg-green-600/5" : "border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card"}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${isPublished ? "text-green-700 dark:text-green-400" : "text-primary"}`}>
              {isPublished ? <><Eye className="h-3.5 w-3.5 shrink-0" /> Profil visible</> : <><EyeOff className="h-3.5 w-3.5 shrink-0" /> Profil masqué</>}
            </div>
            <h2 className="mt-1 font-display text-lg font-bold sm:text-xl">
              {isPublished ? `Visibilité active (${expiresIn}j restants)` : "Activez votre visibilité pour apparaître dans la marketplace"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPublished
                ? `Expiration le ${new Date(profile!.published_until!).toLocaleDateString("fr-FR")}. Renouvelez pour ${publishCost} jetons (${publishDays} jours supplémentaires).`
              : `Coût : ${publishCost} jetons pour ${publishDays} jours. Vos jobs seront visibles dans /services et dans la recherche.`}
            </p>
            {!kycApproved && (
              <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                🔒 Votre pièce d'identité (KYC) doit être validée avant de pouvoir activer la visibilité.
              </p>
            )}
          </div>
          <Button
            size="lg"
            onClick={publishProfile}
            disabled={publishing || !kycApproved || balance < publishCost}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white md:w-auto md:shrink-0"
            title={!kycApproved ? "KYC requis" : balance < publishCost ? "Solde insuffisant" : undefined}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {publishing ? "Activation…" : isPublished ? `Renouveler (-${publishCost})` : `Activer (-${publishCost} jetons)`}
          </Button>
        </div>
      </section>

      <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Portefeuille</DialogTitle></DialogHeader>
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
                {paying ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {pendingPaymentId ? "En attente du paiement…" : "Initialisation…"}</>) : (<><Smartphone className="mr-2 h-4 w-4" /> Payer avec Mobile Money</>)}
              </Button>
              {pendingPaymentId && (<p className="text-xs text-muted-foreground text-center">Complétez le paiement dans l'onglet Fapshi. Vos jetons seront ajoutés automatiquement.</p>)}
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold">Historique</div>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {txs.length === 0 && <p className="text-xs text-muted-foreground">Aucune opération.</p>}
                {txs.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
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

      <Tabs defaultValue="notifs" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="notifs">Notifications {unread > 0 && <Badge className="ml-2">{unread}</Badge>}</TabsTrigger>
        </TabsList>

        <TabsContent value="notifs" className="mt-4 space-y-2">
          <div className="mb-2 flex justify-end">
            <Link to="/notifications" className="text-sm text-primary hover:underline">Voir toutes les notifications →</Link>
          </div>
          {notifs.length === 0 && <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aucune notification.</div>}
          {notifs.map((n) => {
            const style = getNotificationStyle(n.title);
            const Icon = style.icon;
            return (
              <button key={n.id} onClick={async () => { await supabase.from("notifications").update({ read: true }).eq("id", n.id); if (n.link) navigate(n.link); load(); }} className={`relative flex w-full items-start justify-between gap-3 rounded-lg border ${style.border} ${style.bg} p-3 text-left transition-colors hover:brightness-[0.98] dark:hover:brightness-110 ${!n.read ? "ring-1 ring-primary/10" : ""}`}>
                <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${style.bar}`} />
                <div className="ml-3 min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <Icon className={`h-4 w-4 shrink-0 ${style.iconColor}`} />
                    {n.title}
                  </div>
                  {n.content && <div className="text-sm text-muted-foreground">{n.content}</div>}
                  <div className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </button>
            );
          })}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
