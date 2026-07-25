import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LayoutDashboard, MessageSquare, Bell, Home, Briefcase, Plus, User, Eye, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const items = [
  { to: "/dashboard/client", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/dashboard/client/projects", label: "Mes offres", icon: Briefcase },
  { to: "/services", label: "Trouver un pro", icon: Home },
  { to: "/messages", label: "Messagerie", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Mon profil", icon: User },
];

type Project = {
  id: string; title: string; description: string; budget: number | null; city: string | null;
  status: string; created_at: string; selected_provider_id: string | null; category: string | null;
};

export function ClientProjects() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [profile, setProfile] = useState<{ full_name: string | null; name: string; avatar_url: string | null } | null>(null);
  const [sort, setSort] = useState<"date_desc" | "date_asc">("date_desc");

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [loading, user, navigate]);

  const load = async () => {
    if (!user) return;
    const [{ data: pj }, { data: pf }] = await Promise.all([
      supabase.from("projects").select("*").eq("client_id", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("full_name,name,avatar_url").eq("id", user.id).maybeSingle(),
    ]);
    const list = (pj ?? []) as Project[];
    setProjects(list);
    setProfile(pf);
    if (list.length) {
      const { data: apps } = await supabase.from("applications").select("project_id").in("project_id", list.map((p) => p.id));
      const c: Record<string, number> = {};
      (apps ?? []).forEach((a: any) => { c[a.project_id] = (c[a.project_id] ?? 0) + 1; });
      setCounts(c);
    }
  };
  useEffect(() => { load(); }, [user]);

  const cancel = async (id: string) => {
    if (!confirm("Annuler cette offre ? Cette action est irréversible et les jetons dépensés ne seront pas remboursés.")) return;
    const { error } = await supabase.rpc("cancel_project", { _project_id: id });
    if (error) return toast.error(error.message);
    toast.success("Offre annulée. Les jetons dépensés ne sont pas remboursables.");
    load();
  };

  if (loading || !user) return null;

  return (
    <DashboardLayout
      title="Mes offres"
      items={items}
      hideSearch
      user={{ name: profile?.full_name ?? profile?.name ?? user.email ?? "Client", role: "Utilisateur", avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.name || user.email}&backgroundColor=ea7c2c` }}
    >
      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">Publiez une offre pour recevoir des candidatures de prestataires.</p>
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="h-10 w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Plus récentes d'abord</SelectItem>
              <SelectItem value="date_asc">Plus anciennes d'abord</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild><Link to="/dashboard/client/projects/new"><Plus className="mr-2 h-4 w-4" /> Publier une offre (10 jetons)</Link></Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">Aucune offre publiée</p>
          <p className="text-sm text-muted-foreground">Publiez votre première offre pour recevoir des candidatures.</p>
          <Button asChild className="mt-4"><Link to="/dashboard/client/projects/new"><Plus className="mr-2 h-4 w-4" />Nouvelle offre</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {[...projects].sort((a, b) => {
            const da = new Date(a.created_at).getTime();
            const db = new Date(b.created_at).getTime();
            return sort === "date_asc" ? da - db : db - da;
          }).map((p) => (
            <div key={p.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{p.title}</h3>
                    {p.category && <Badge variant="outline" className="capitalize">{p.category}</Badge>}
                    <Badge variant={p.status === "open" ? "default" : p.status === "in_progress" ? "secondary" : "outline"}>
                      {p.status === "open" ? "Ouverte" : p.status === "in_progress" ? "En cours" : p.status === "cancelled" ? "Annulée" : p.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />Publiée le {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    {p.budget != null && <span>Budget : {p.budget} FCFA</span>}
                    {p.city && <span>Ville : {p.city}</span>}
                    <span>{counts[p.id] ?? 0} candidature(s)</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button asChild size="sm" variant="outline"><Link to={`/dashboard/client/projects/${encodeURIComponent(p.id)}`}><Eye className="mr-2 h-3 w-3" />Voir</Link></Button>
                  {p.status === "open" && !p.selected_provider_id && (
                    <Button size="sm" variant="ghost" onClick={() => cancel(p.id)}><X className="mr-2 h-3 w-3" />Annuler</Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
