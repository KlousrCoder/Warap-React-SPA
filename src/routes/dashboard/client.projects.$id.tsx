import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LayoutDashboard, MessageSquare, Bell, Home, Briefcase, User, ArrowLeft, Star, MapPin, Trophy, CheckCircle2, MessageCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const items = [
  { to: "/dashboard/client", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/dashboard/client/projects", label: "Mes offres", icon: Briefcase },
  { to: "/services", label: "Trouver un pro", icon: Home },
  { to: "/messages", label: "Messagerie", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Mon profil", icon: User },
];

type Project = { id: string; title: string; description: string; budget: number | null; city: string | null; status: string; created_at: string; expires_at: string | null; selected_provider_id: string | null; category: string | null };
type Applicant = {
  id: string; project_id: string; prestataire_id: string; cover_letter: string | null;
  boost_count: number; status: string; created_at: string; rank: number;
  provider_name: string; provider_avatar: string | null; provider_city: string | null; provider_category: string | null;
  provider_rating: number; provider_reviews: number;
};

export function ProjectDetail() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [apps, setApps] = useState<Applicant[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null; name: string; avatar_url: string | null } | null>(null);

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [loading, user, navigate]);

  const load = async () => {
    if (!user) return;
    const [{ data: pj }, { data: a }, { data: pf }] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase.rpc("get_my_project_applications", { _project_id: id }),
      supabase.from("profiles").select("full_name,name,avatar_url").eq("id", user.id).maybeSingle(),
    ]);
    setProject(pj as Project | null);
    setApps((a ?? []) as Applicant[]);
    setProfile(pf);
  };
  useEffect(() => { load(); }, [user, id]);

  const select = async (appId: string) => {
    if (!confirm("Sélectionner ce prestataire ? Les autres candidats seront refusés.")) return;
    const { error } = await supabase.rpc("select_provider", { _project_id: id, _application_id: appId });
    if (error) return toast.error(error.message);
    toast.success("Prestataire sélectionné");
    load();
  };

  const message = async (providerId: string) => {
    navigate(`/messages?to=${encodeURIComponent(providerId)}`);
  };

  if (loading || !user) return null;

  return (
    <DashboardLayout
      title="Détail de l'offre"
      items={items}
      hideSearch
      user={{ name: profile?.full_name ?? profile?.name ?? user.email ?? "Client", role: "Utilisateur", avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.name || user.email}&backgroundColor=ea7c2c` }}
    >
      <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/dashboard/client/projects"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link></Button>

      {!project ? (
        <p className="text-muted-foreground">Offre introuvable.</p>
      ) : (
        <>
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold">{project.title}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {project.category && <Badge variant="outline" className="capitalize">{project.category}</Badge>}
                  {project.budget != null && <span>Budget : {project.budget} FCFA</span>}
                  {project.city && <span><MapPin className="inline h-3 w-3" /> {project.city}</span>}
                </div>
              </div>
              <Badge variant={project.status === "open" ? "default" : "secondary"}>
                {project.status === "open" ? "Ouverte" : project.status === "in_progress" ? "En cours" : project.status}
              </Badge>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm">{project.description}</p>
            {project.expires_at && (() => {
              const exp = new Date(project.expires_at);
              const now = new Date();
              const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const expired = diffDays <= 0;
              return (
                <div className={`mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${expired ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-muted bg-muted/30 text-muted-foreground"}`}>
                  <Clock className="h-3.5 w-3.5" />
                  {expired
                    ? <>Cette offre a expiré le {exp.toLocaleDateString("fr-FR")} et n'est plus visible des prestataires.</>
                    : <>Cette offre expire le <strong className="text-foreground">{exp.toLocaleDateString("fr-FR")}</strong> ({diffDays} jour{diffDays > 1 ? "s" : ""} restant{diffDays > 1 ? "s" : ""}).</>}
                </div>
              );
            })()}
          </div>

          <div className="mt-6">
            <h3 className="mb-3 font-semibold">Candidatures ({apps.length})</h3>
            {apps.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Aucune candidature pour l'instant.
              </div>
            ) : (
              <div className="space-y-3">
                {apps.map((a) => {
                  const isSelected = project.selected_provider_id === a.prestataire_id;
                  return (
                    <div key={a.id} className={`rounded-xl border p-4 ${isSelected ? "border-primary bg-primary/5" : "bg-card"}`}>
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center w-12">
                          <div className="flex items-center gap-1 font-bold text-primary"><Trophy className="h-4 w-4" />#{a.rank}</div>
                          {a.boost_count > 0 && <span className="text-[10px] text-muted-foreground mt-1">⚡{a.boost_count}</span>}
                        </div>
                        <img src={a.provider_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${a.provider_name}`} className="h-12 w-12 rounded-full" alt="" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/providers/${encodeURIComponent(a.prestataire_id)}`} className="font-semibold hover:underline">{a.provider_name}</Link>
                            {a.provider_category && <Badge variant="outline" className="text-xs">{a.provider_category}</Badge>}
                            {isSelected && <Badge className="text-xs"><CheckCircle2 className="mr-1 h-3 w-3" />Sélectionné</Badge>}
                            {a.status === "rejected" && <Badge variant="secondary" className="text-xs">Refusé</Badge>}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {a.provider_city && <span><MapPin className="inline h-3 w-3" /> {a.provider_city}</span>}
                            <span><Star className="inline h-3 w-3 fill-amber-400 text-amber-400" /> {a.provider_rating} ({a.provider_reviews})</span>
                          </div>
                          {a.cover_letter && <p className="mt-2 text-sm whitespace-pre-line">{a.cover_letter}</p>}
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => message(a.prestataire_id)}><MessageCircle className="mr-2 h-3 w-3" />Message</Button>
                          {project.status === "open" && !project.selected_provider_id && (
                            <Button size="sm" onClick={() => select(a.id)}><CheckCircle2 className="mr-2 h-3 w-3" />Sélectionner</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
