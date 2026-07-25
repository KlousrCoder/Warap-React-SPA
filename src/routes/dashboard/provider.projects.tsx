import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LayoutDashboard, MessageSquare, Wrench, FolderKanban, FileCheck, User, Briefcase, Trophy, Zap, MapPin, Send, Clock, Search, SlidersHorizontal, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORY_TINTS = [
  "border-transparent bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200",
  "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
  "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  "border-transparent bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200",
  "border-transparent bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-200",
  "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  "border-transparent bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200",
  "border-transparent bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200",
  "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
  "border-transparent bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200",
  "border-transparent bg-lime-100 text-lime-900 dark:bg-lime-500/20 dark:text-lime-200",
  "border-transparent bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-200",
];
function categoryTint(cat?: string | null) {
  if (!cat) return CATEGORY_TINTS[0];
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0;
  return CATEGORY_TINTS[h % CATEGORY_TINTS.length];
}




const items = [
  { to: "/dashboard/provider", label: "Tableau de bord", icon: LayoutDashboard },
  
  { to: "/dashboard/provider/portfolio", label: "Portfolio", icon: FolderKanban },
  { to: "/dashboard/provider/projects", label: "Marketplace", icon: Briefcase },
  { to: "/dashboard/provider/kyc", label: "KYC", icon: FileCheck },
  { to: "/messages", label: "Messagerie", icon: MessageSquare },
  { to: "/profile", label: "Mon profil", icon: User },
];

type OpenProject = {
  id: string; title: string; description: string; budget: number | null; city: string | null; created_at: string;
  expires_at: string | null;
  category: string | null;
  client_id: string; client_name: string; client_avatar: string | null;
  application_count: number; max_applications: number; my_rank: number | null; has_applied: boolean;
};
type MyApp = { id: string; project_id: string; boost_count: number; status: string };

export function ProviderProjects() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [list, setList] = useState<OpenProject[]>([]);
  const [myApps, setMyApps] = useState<Record<string, MyApp>>({});
  const [profile, setProfile] = useState<{ full_name: string | null; name: string; avatar_url: string | null } | null>(null);
  const [balance, setBalance] = useState(0);
  const [applyOpen, setApplyOpen] = useState<OpenProject | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applyCost, setApplyCost] = useState(5);
  const [boostCost, setBoostCost] = useState(5);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "expiring" | "price_desc" | "price_asc">("recent");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [loading, user, navigate]);

  const load = async () => {
    if (!user) return;
    const [{ data: op }, { data: w }, { data: pf }, { data: settings }, { data: ma }] = await Promise.all([
      supabase.rpc("get_open_projects"),
      supabase.from("wallets").select("balance_tokens").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("full_name,name,avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("app_settings").select("key,value").in("key", ["application_token_cost", "application_boost_cost"]),
      supabase.from("applications").select("id,project_id,boost_count,status").eq("prestataire_id", user.id),
    ]);
    setList((op ?? []) as OpenProject[]);
    setBalance(w?.balance_tokens ?? 0);
    setProfile(pf);
    (settings ?? []).forEach((s: any) => {
      if (s.key === "application_token_cost") setApplyCost(parseInt(s.value));
      if (s.key === "application_boost_cost") setBoostCost(parseInt(s.value));
    });
    const map: Record<string, MyApp> = {};
    (ma ?? []).forEach((a: any) => { map[a.project_id] = a; });
    setMyApps(map);
  };
  useEffect(() => { load(); }, [user]);

  const applyIdFromUrl = new URLSearchParams(location.search).get("apply") ?? undefined;
  useEffect(() => {
    if (!applyIdFromUrl || list.length === 0) return;
    const p = list.find((x) => x.id === applyIdFromUrl);
    if (p) { setApplyOpen(p); setCoverLetter(""); }
    const next = new URLSearchParams(location.search);
    next.delete("apply");
    navigate(`${location.pathname}${next.toString() ? `?${next.toString()}` : ""}`, { replace: true });
  }, [applyIdFromUrl, list, location.pathname, location.search, navigate]);


  const apply = async () => {
    if (!applyOpen) return;
    if (coverLetter.trim().length < 10) return toast.error("Lettre trop courte (min. 10 caractères)");
    setSubmitting(true);
    const { data, error } = await supabase.rpc("apply_to_project", { _project_id: applyOpen.id, _cover_letter: coverLetter.trim() });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    const d = data as any;
    toast.success(`Candidature envoyée — classé #${d.position}/${d.max}`);
    setApplyOpen(null); setCoverLetter("");
    load();
  };

  const boost = async (appId: string) => {
    if (!confirm(`Booster cette candidature pour ${boostCost} jetons ?`)) return;
    const { data, error } = await supabase.rpc("boost_application", { _application_id: appId });
    if (error) return toast.error(error.message);
    const d = data as any;
    toast.success(`Boost effectué — classé #${d.position}/${d.max}`);
    load();
  };

  if (loading || !user) return null;

  const categories = Array.from(new Set(list.map((p) => p.category).filter(Boolean))) as string[];

  const filtered = useMemo(() => {
    const min = minPrice ? parseFloat(minPrice) : null;
    const max = maxPrice ? parseFloat(maxPrice) : null;
    const q = query.trim().toLowerCase();
    let arr = list.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (q && !(p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))) return false;
      if (min != null && (p.budget == null || p.budget < min)) return false;
      if (max != null && (p.budget == null || p.budget > max)) return false;
      return true;
    });
    arr.sort((a, b) => {
      switch (sortBy) {
        case "recent": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "expiring": {
          const ae = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
          const be = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
          return ae - be;
        }
        case "price_desc": return (b.budget ?? -Infinity) - (a.budget ?? -Infinity);
        case "price_asc": return (a.budget ?? Infinity) - (b.budget ?? Infinity);
      }
    });
    return arr;
  }, [list, query, category, sortBy, minPrice, maxPrice]);

  return (
    <DashboardLayout
      title="Marketplace"
      items={items}
      hideSearch
      user={{ name: profile?.full_name ?? profile?.name ?? user.email ?? "Prestataire", role: "Prestataire", avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.name || user.email}&backgroundColor=ea7c2c` }}
    >
      <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        Solde : <strong>{balance} jetons</strong> · Candidature : {applyCost} jetons · Boost : {boostCost} jetons. Booster monte votre classement, sans garantir la sélection.
      </div>

      <div className="mb-6 rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="h-4 w-4" /> Filtres
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Rechercher une offre..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger><SelectValue placeholder="Trier par" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Plus récentes</SelectItem>
              <SelectItem value="oldest">Plus anciennes</SelectItem>
              <SelectItem value="expiring">Expire bientôt</SelectItem>
              <SelectItem value="price_desc">Prix décroissant</SelectItem>
              <SelectItem value="price_asc">Prix croissant</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="number" placeholder="Min FCFA" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            <Input type="number" placeholder="Max FCFA" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} offre(s) affichée(s) sur {list.length}</span>
          {(query || category !== "all" || minPrice || maxPrice || sortBy !== "recent") && (
            <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setCategory("all"); setSortBy("recent"); setMinPrice(""); setMaxPrice(""); }}>
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">Aucune offre ne correspond</p>
          <p className="text-sm text-muted-foreground">Modifiez vos filtres ou revenez plus tard.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const mine = myApps[p.id];
            const full = p.application_count >= p.max_applications && !mine;
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (mine || full || balance < applyCost) return;
                  setApplyOpen(p); setCoverLetter("");
                }}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !mine && !full && balance >= applyCost) {
                    e.preventDefault(); setApplyOpen(p); setCoverLetter("");
                  }
                }}
                className={`rounded-xl border bg-card p-4 shadow-sm transition ${mine || full || balance < applyCost ? "" : "cursor-pointer hover:border-primary/50 hover:shadow-md"}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{p.title}</h3>
                      {p.category && <Badge variant="outline" className={`text-xs capitalize ${categoryTint(p.category)}`}>{p.category}</Badge>}
                      {mine && (
                        <Badge variant="default" className="text-xs"><Trophy className="mr-1 h-3 w-3" />#{p.my_rank}/{p.max_applications}</Badge>
                      )}
                      {full && <Badge variant="secondary" className="text-xs">Complète</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{p.description}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Par {p.client_name}</span>
                      {p.budget != null && <span>Budget : {p.budget} FCFA</span>}
                      {p.city && <span><MapPin className="inline h-3 w-3" /> {p.city}</span>}
                      <span>{p.application_count}/{p.max_applications} candidatures</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />Publiée le {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      {p.expires_at && (() => {
                        const diffDays = Math.ceil((new Date(p.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return (
                          <span className={diffDays <= 3 ? "text-destructive font-medium" : ""}>
                            <Clock className="inline h-3 w-3" /> Expire dans {diffDays} j
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {mine ? (
                      <Button size="sm" variant="outline" onClick={() => boost(mine.id)}>
                        <Zap className="mr-2 h-3 w-3" />Booster ({boostCost} jetons)
                      </Button>
                    ) : (
                      <Button size="sm" disabled={full || balance < applyCost} onClick={() => { setApplyOpen(p); setCoverLetter(""); }}>
                        <Send className="mr-2 h-3 w-3" />Postuler ({applyCost} jetons)
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!applyOpen} onOpenChange={(o) => !o && setApplyOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Postuler à : {applyOpen?.title}</DialogTitle>
          </DialogHeader>
          <Textarea rows={6} placeholder="Présentez-vous et expliquez pourquoi vous êtes le bon prestataire..." value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
          <p className="text-xs text-muted-foreground">Coût : {applyCost} jetons. Solde : {balance}.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(null)}>Annuler</Button>
            <Button onClick={apply} disabled={submitting}>{submitting ? "Envoi..." : "Envoyer ma candidature"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
