import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout, StatCard } from "@/components/layout/DashboardLayout";
import { LayoutDashboard, Users, Briefcase, Wallet, Trash2, Ban, CheckCircle2, ShieldCheck, ShieldAlert, ExternalLink, Settings, MessageSquare, GraduationCap, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AdminSettingsPanel } from "@/components/admin/AdminSettingsPanel";

type Profile = { id: string; full_name: string | null; name: string; email: string; city: string | null; suspended: boolean; avatar_url: string | null };
type Project = { id: string; title: string; status: string; client_id: string; created_at: string; budget: number | null };
type Wallet = { user_id: string; balance_tokens: number };
type Kyc = { id: string; user_id: string; document_path: string; status: string; notes: string | null; created_at: string };
type Diploma = { id: string; user_id: string; title: string; institution: string | null; year: number | null; document_path: string | null; badge_color: string; status: string; notes: string | null; created_at: string };
type PortfolioRow = { id: string; user_id: string; title: string; description: string | null; image_url: string | null; category: string | null; location: string | null; completed_at: string | null; status: string; notes: string | null; created_at: string };

const items = [
  { to: "/dashboard/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/messages", label: "Messagerie", icon: MessageSquare },
  { to: "/profile", label: "Mon profil", icon: Users },
];

export function AdminDash() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [kycs, setKycs] = useState<Kyc[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [diplomas, setDiplomas] = useState<Diploma[]>([]);
  const [dipNotes, setDipNotes] = useState<Record<string, string>>({});
  const [works, setWorks] = useState<PortfolioRow[]>([]);
  const [workNotes, setWorkNotes] = useState<Record<string, string>>({});
  const [tokenCost, setTokenCost] = useState("5");
  const [savingCost, setSavingCost] = useState(false);
  const [contactCost, setContactCost] = useState("3");
  const [savingContact, setSavingContact] = useState(false);
  const [maxApps, setMaxApps] = useState("5");
  const [savingMax, setSavingMax] = useState(false);
  const [boostCost, setBoostCost] = useState("5");
  const [savingBoost, setSavingBoost] = useState(false);
  const [refundWindow, setRefundWindow] = useState("6");
  const [savingRefund, setSavingRefund] = useState(false);
  const [publishCost, setPublishCost] = useState("20");
  const [savingPublishCost, setSavingPublishCost] = useState(false);
  const [publishDays, setPublishDays] = useState("30");
  const [savingPublishDays, setSavingPublishDays] = useState(false);
  const [projectPostCost, setProjectPostCost] = useState("10");
  const [savingProjectPost, setSavingProjectPost] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/login");
    else if (role && role !== "admin") navigate("/");
  }, [user, role, loading, navigate]);

  const load = async () => {
    const [{ data: pf }, { data: pj }, { data: wl }, { data: rl }, { data: kc }, { data: st }, { data: st2 }, { data: st3 }, { data: st4 }, { data: st5 }, { data: st6 }, { data: st7 }, { data: st8 }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("wallets").select("user_id, balance_tokens"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("kyc_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("app_settings").select("value").eq("key", "application_token_cost").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "contact_token_cost").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "max_applications_per_project").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "application_boost_cost").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "refund_window_hours").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "profile_publish_cost").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "profile_publish_duration_days").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "project_post_cost").maybeSingle(),
    ]);
    const { data: dp } = await (supabase.from("diplomas" as never) as any).select("*").order("created_at", { ascending: false });
    const { data: wk } = await supabase.from("portfolio").select("*").order("created_at", { ascending: false });
    setProfiles((pf ?? []) as Profile[]);
    setProjects((pj ?? []) as Project[]);
    setWallets((wl ?? []) as Wallet[]);
    setRoles(Object.fromEntries((rl ?? []).map((r) => [r.user_id, r.role])));
    setKycs((kc ?? []) as Kyc[]);
    setDiplomas((dp ?? []) as Diploma[]);
    setWorks((wk ?? []) as PortfolioRow[]);
    if (st?.value != null) setTokenCost(String(st.value));
    if (st2?.value != null) setContactCost(String(st2.value));
    if (st3?.value != null) setMaxApps(String(st3.value));
    if (st4?.value != null) setBoostCost(String(st4.value));
    if (st5?.value != null) setRefundWindow(String(st5.value));
    if (st6?.value != null) setPublishCost(String(st6.value));
    if (st7?.value != null) setPublishDays(String(st7.value));
    if (st8?.value != null) setProjectPostCost(String(st8.value));
  };

  const saveSetting = async (key: string, value: string, setSaving: (v: boolean) => void, min = 1, max = 100) => {
    const n = Number(value);
    if (!n || n < min || n > max) return toast.error(`Valeur entre ${min} et ${max}`);
    setSaving(true);
    const { error } = await supabase.from("app_settings")
      .update({ value: n, updated_at: new Date().toISOString() })
      .eq("key", key);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Réglage mis à jour");
  };
  const saveTokenCost = () => saveSetting("application_token_cost", tokenCost, setSavingCost);
  const saveContactCost = () => saveSetting("contact_token_cost", contactCost, setSavingContact);
  const saveMaxApps = () => saveSetting("max_applications_per_project", maxApps, setSavingMax);
  const saveBoostCost = () => saveSetting("application_boost_cost", boostCost, setSavingBoost);
  const saveRefundWindow = () => saveSetting("refund_window_hours", refundWindow, setSavingRefund, 6, 168);
  const saveProjectPostCost = () => saveSetting("project_post_cost", projectPostCost, setSavingProjectPost, 1, 1000);


  useEffect(() => { if (role === "admin") load(); }, [role]);
  const savePublishCost = () => saveSetting("profile_publish_cost", publishCost, setSavingPublishCost, 1, 1000);
  const savePublishDays = () => saveSetting("profile_publish_duration_days", publishDays, setSavingPublishDays, 1, 365);
  const openKycDoc = async (path: string) => {
    const { data, error } = await supabase.storage.from("kyc").createSignedUrl(path, 300);
    if (error || !data) return toast.error("Impossible d'ouvrir le document");
    window.open(data.signedUrl, "_blank");
  };

  const openDiplomaDoc = async (path: string) => {
    const { data, error } = await supabase.storage.from("diplomas").createSignedUrl(path, 300);
    if (error || !data) return toast.error("Impossible d'ouvrir le document");
    window.open(data.signedUrl, "_blank");
  };

  const reviewDiploma = async (d: Diploma, status: "approved" | "rejected") => {
    const { error } = await supabase.rpc("review_diploma" as never, { _diploma_id: d.id, _status: status, _notes: dipNotes[d.id] || null } as never);
    if (error) return toast.error((error as { message?: string }).message ?? "Erreur");
    toast.success(status === "approved" ? "Diplôme validé" : "Diplôme refusé");
    load();
  };

  const reviewWork = async (p: PortfolioRow, status: "approved" | "rejected") => {
    const { error } = await supabase.rpc("review_portfolio" as never, { _portfolio_id: p.id, _status: status, _notes: workNotes[p.id] || null } as never);
    if (error) return toast.error((error as { message?: string }).message ?? "Erreur");
    toast.success(status === "approved" ? "Réalisation validée" : "Réalisation refusée");
    load();
  };

  const reviewKyc = async (k: Kyc, status: "approved" | "rejected") => {
    const { error } = await supabase.from("kyc_submissions").update({
      status, notes: notesById[k.id] || null, reviewed_at: new Date().toISOString(), reviewed_by: user?.id,
    }).eq("id", k.id);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: k.user_id,
      title: status === "approved" ? "KYC validé" : "KYC refusé",
      content: status === "approved" ? "Votre pièce d'identité a été validée." : (notesById[k.id] || "Veuillez renvoyer une pièce valide."),
      link: "/dashboard/provider/kyc",
    });
    toast.success(status === "approved" ? "KYC validé" : "KYC refusé");
    load();
  };

  const toggleSuspend = async (p: Profile) => {
    if (p.suspended && roles[p.id] === "provider") {
      const k = kycs.find((x) => x.user_id === p.id);
      if (!k || k.status !== "approved") {
        return toast.error("Impossible de réactiver : le prestataire doit avoir soumis une pièce d'identité validée.");
      }
    }
    const { error } = await supabase.from("profiles").update({ suspended: !p.suspended }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(p.suspended ? "Utilisateur réactivé" : "Utilisateur suspendu"); load();
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Supprimer ce projet ?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Projet supprimé"); load();
  };

  if (loading || role !== "admin") return null;
  const walletMap = Object.fromEntries(wallets.map((w) => [w.user_id, w.balance_tokens]));

  return (
    <DashboardLayout
      title="Administration"
      items={items}
      user={{ name: "Admin", role: "Super Admin", avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Admin&backgroundColor=1a1a1a" }}
    >
      <div className="grid gap-5 md:grid-cols-4">
        <StatCard label="Utilisateurs" value={String(profiles.length)} icon={Users} />
        <StatCard label="Projets" value={String(projects.length)} icon={Briefcase} />
        <StatCard label="KYC en attente" value={String(kycs.filter((k) => k.status === "pending").length)} icon={ShieldAlert} />
        <StatCard label="Total jetons" value={String(wallets.reduce((s, w) => s + w.balance_tokens, 0))} icon={Wallet} />
      </div>

      <Tabs defaultValue="users" className="mt-6">
        <TabsList>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="projects">Projets</TabsTrigger>
          <TabsTrigger value="kyc">KYC {kycs.filter((k) => k.status === "pending").length > 0 && <Badge className="ml-2">{kycs.filter((k) => k.status === "pending").length}</Badge>}</TabsTrigger>
          <TabsTrigger value="diplomas"><GraduationCap className="mr-1.5 h-3.5 w-3.5" />Diplômes {diplomas.filter((d) => d.status === "pending").length > 0 && <Badge className="ml-2">{diplomas.filter((d) => d.status === "pending").length}</Badge>}</TabsTrigger>
          <TabsTrigger value="works"><Hammer className="mr-1.5 h-3.5 w-3.5" />Réalisations {works.filter((w) => w.status === "pending").length > 0 && <Badge className="ml-2">{works.filter((w) => w.status === "pending").length}</Badge>}</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="mr-1.5 h-3.5 w-3.5" />Réglages</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-4 py-3">Nom</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Rôle</th><th className="px-4 py-3">KYC</th><th className="px-4 py-3">Jetons</th><th className="px-4 py-3">Statut</th><th /></tr>
              </thead>
              <tbody>
                {profiles.map((p) => {
                  const r = roles[p.id];
                  const k = kycs.find((x) => x.user_id === p.id);
                  const isProvider = r === "provider";
                  const canReactivate = !isProvider || (k?.status === "approved");
                  return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{p.full_name ?? p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                    <td className="px-4 py-3">{(() => {
                      if (r === "admin") return <Badge className="bg-red-600 text-white hover:bg-red-700">Admin</Badge>;
                      if (r === "provider") return <Badge className="bg-orange-600 text-white hover:bg-orange-700">Prestataire</Badge>;
                      if (r === "client") return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Utilisateur</Badge>;
                      return <Badge variant="outline">—</Badge>;
                    })()}</td>
                    <td className="px-4 py-3">{
                      !isProvider ? <span className="text-xs text-muted-foreground">—</span>
                      : !k ? <Badge variant="outline">Non soumis</Badge>
                      : k.status === "approved" ? <Badge className="bg-green-600 text-white hover:bg-green-700"><ShieldCheck className="mr-1 h-3 w-3" />Validé</Badge>
                      : k.status === "rejected" ? <Badge variant="destructive">Refusé</Badge>
                      : <Badge variant="secondary">En attente</Badge>
                    }</td>
                    <td className="px-4 py-3">{walletMap[p.id] ?? 0}</td>
                    <td className="px-4 py-3">{p.suspended ? <Badge variant="destructive">Suspendu</Badge> : <Badge variant="secondary">Actif</Badge>}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => toggleSuspend(p)} disabled={p.suspended && !canReactivate} title={p.suspended && !canReactivate ? "KYC non validé : impossible de réactiver" : undefined}>
                        {p.suspended ? <><CheckCircle2 className="mr-1 h-4 w-4" /> Réactiver</> : <><Ban className="mr-1 h-4 w-4" /> Suspendre</>}
                      </Button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-4 py-3">Titre</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Budget</th><th className="px-4 py-3">Date</th><th /></tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{p.title}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{p.status}</Badge></td>
                    <td className="px-4 py-3">{p.budget?.toLocaleString() ?? "—"} FCFA</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => deleteProject(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="kyc" className="mt-4 space-y-3">
          {kycs.length === 0 && <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aucune soumission KYC.</div>}
          {kycs.map((k) => {
            const owner = profiles.find((p) => p.id === k.user_id);
            return (
              <div key={k.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{owner?.full_name ?? owner?.name ?? k.user_id}</div>
                    <div className="text-xs text-muted-foreground">{owner?.email} · envoyée le {new Date(k.created_at).toLocaleString()}</div>
                    <div className="mt-1">{(() => {
                      const r = owner ? roles[owner.id] : undefined;
                      if (r === "admin") return <Badge className="bg-red-600 text-white hover:bg-red-700 text-[10px] px-1.5 py-0">Admin</Badge>;
                      if (r === "provider") return <Badge className="bg-orange-600 text-white hover:bg-orange-700 text-[10px] px-1.5 py-0">Prestataire</Badge>;
                      if (r === "client") return <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-[10px] px-1.5 py-0">Utilisateur</Badge>;
                      return null;
                    })()}</div>
                  </div>
                  <Badge variant={k.status === "approved" ? "default" : k.status === "rejected" ? "destructive" : "secondary"}>
                    {k.status === "approved" ? <><ShieldCheck className="mr-1 h-3 w-3" /> Validé</> : k.status === "rejected" ? <><ShieldAlert className="mr-1 h-3 w-3" /> Refusé</> : "En attente"}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openKycDoc(k.document_path)}>
                    <ExternalLink className="mr-1.5 h-4 w-4" /> Consulter la pièce
                  </Button>
                </div>
                {k.status === "pending" && (
                  <div className="mt-3 space-y-2">
                    <Textarea rows={2} placeholder="Note (obligatoire en cas de refus)…" value={notesById[k.id] ?? ""} onChange={(e) => setNotesById({ ...notesById, [k.id]: e.target.value })} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => reviewKyc(k, "approved")}><CheckCircle2 className="mr-1.5 h-4 w-4" /> Valider</Button>
                      <Button size="sm" variant="destructive" onClick={() => reviewKyc(k, "rejected")}><Ban className="mr-1.5 h-4 w-4" /> Refuser</Button>
                    </div>
                  </div>
                )}
                {k.status !== "pending" && k.notes && <p className="mt-2 text-sm text-muted-foreground">Note : {k.notes}</p>}
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="diplomas" className="mt-4 space-y-3">
          {diplomas.length === 0 && <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aucun diplôme soumis.</div>}
          {diplomas.map((d) => {
            const owner = profiles.find((p) => p.id === d.user_id);
            return (
              <div key={d.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white"
                      style={{ backgroundColor: d.badge_color }}
                      title={`Couleur badge: ${d.badge_color}`}
                    >
                      <GraduationCap className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="font-semibold">{d.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {owner?.full_name ?? owner?.name ?? d.user_id} · {d.institution ?? "—"}{d.year ? ` · ${d.year}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">Soumis le {new Date(d.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <Badge variant={d.status === "approved" ? "default" : d.status === "rejected" ? "destructive" : "secondary"}>
                    {d.status === "approved" ? <><ShieldCheck className="mr-1 h-3 w-3" /> Validé</> : d.status === "rejected" ? <><ShieldAlert className="mr-1 h-3 w-3" /> Refusé</> : "En attente"}
                  </Badge>
                </div>
                {d.document_path && (
                  <div className="mt-3 flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openDiplomaDoc(d.document_path!)}>
                      <ExternalLink className="mr-1.5 h-4 w-4" /> Consulter le diplôme
                    </Button>
                  </div>
                )}
                {d.status === "pending" && (
                  <div className="mt-3 space-y-2">
                    <Textarea rows={2} placeholder="Note (obligatoire en cas de refus)…" value={dipNotes[d.id] ?? ""} onChange={(e) => setDipNotes({ ...dipNotes, [d.id]: e.target.value })} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => reviewDiploma(d, "approved")}><CheckCircle2 className="mr-1.5 h-4 w-4" /> Valider</Button>
                      <Button size="sm" variant="destructive" onClick={() => reviewDiploma(d, "rejected")}><Ban className="mr-1.5 h-4 w-4" /> Refuser</Button>
                    </div>
                  </div>
                )}
                {d.status !== "pending" && d.notes && <p className="mt-2 text-sm text-muted-foreground">Note : {d.notes}</p>}
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="works" className="mt-4 space-y-3">
          {works.length === 0 && <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aucune réalisation soumise.</div>}
          {works.map((w) => {
            const owner = profiles.find((p) => p.id === w.user_id);
            return (
              <div key={w.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {w.image_url ? (
                      <img src={w.image_url} alt={w.title} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Hammer className="h-5 w-5" /></div>
                    )}
                    <div>
                      <div className="font-semibold">{w.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {owner?.full_name ?? owner?.name ?? w.user_id}{w.category ? ` · ${w.category}` : ""}{w.location ? ` · ${w.location}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">Soumis le {new Date(w.created_at).toLocaleString()}</div>
                      {w.description && <p className="mt-1 max-w-xl text-sm text-foreground/80">{w.description}</p>}
                    </div>
                  </div>
                  <Badge variant={w.status === "approved" ? "default" : w.status === "rejected" ? "destructive" : "secondary"}>
                    {w.status === "approved" ? <><ShieldCheck className="mr-1 h-3 w-3" /> Validée</> : w.status === "rejected" ? <><ShieldAlert className="mr-1 h-3 w-3" /> Refusée</> : "En attente"}
                  </Badge>
                </div>
                {w.image_url && (
                  <div className="mt-3">
                    <Button size="sm" variant="outline" onClick={() => window.open(w.image_url!, "_blank")}>
                      <ExternalLink className="mr-1.5 h-4 w-4" /> Voir la photo
                    </Button>
                  </div>
                )}
                {w.status === "pending" && (
                  <div className="mt-3 space-y-2">
                    <Textarea rows={2} placeholder="Note (obligatoire en cas de refus)…" value={workNotes[w.id] ?? ""} onChange={(e) => setWorkNotes({ ...workNotes, [w.id]: e.target.value })} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => reviewWork(w, "approved")}><CheckCircle2 className="mr-1.5 h-4 w-4" /> Valider</Button>
                      <Button size="sm" variant="destructive" onClick={() => reviewWork(w, "rejected")}><Ban className="mr-1.5 h-4 w-4" /> Refuser</Button>
                    </div>
                  </div>
                )}
                {w.status !== "pending" && w.notes && <p className="mt-2 text-sm text-muted-foreground">Note : {w.notes}</p>}
              </div>
            );
          })}
        </TabsContent>


        <TabsContent value="settings" className="mt-4">
          <AdminSettingsPanel />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
