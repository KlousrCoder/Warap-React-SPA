import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LayoutDashboard, FolderKanban, MessageSquare, Plus, Trash2, Wrench, FileCheck, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { categories } from "@/lib/mock-data";

const CATEGORY_TINTS = [
  { card: "border-orange-200 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/10", badge: "border-transparent bg-orange-200 text-orange-900 dark:bg-orange-500/30 dark:text-orange-100", price: "text-orange-700 dark:text-orange-300" },
  { card: "border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10", badge: "border-transparent bg-blue-200 text-blue-900 dark:bg-blue-500/30 dark:text-blue-100", price: "text-blue-700 dark:text-blue-300" },
  { card: "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10", badge: "border-transparent bg-emerald-200 text-emerald-900 dark:bg-emerald-500/30 dark:text-emerald-100", price: "text-emerald-700 dark:text-emerald-300" },
  { card: "border-violet-200 bg-violet-50 dark:border-violet-500/30 dark:bg-violet-500/10", badge: "border-transparent bg-violet-200 text-violet-900 dark:bg-violet-500/30 dark:text-violet-100", price: "text-violet-700 dark:text-violet-300" },
  { card: "border-pink-200 bg-pink-50 dark:border-pink-500/30 dark:bg-pink-500/10", badge: "border-transparent bg-pink-200 text-pink-900 dark:bg-pink-500/30 dark:text-pink-100", price: "text-pink-700 dark:text-pink-300" },
  { card: "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10", badge: "border-transparent bg-amber-200 text-amber-900 dark:bg-amber-500/30 dark:text-amber-100", price: "text-amber-700 dark:text-amber-300" },
  { card: "border-teal-200 bg-teal-50 dark:border-teal-500/30 dark:bg-teal-500/10", badge: "border-transparent bg-teal-200 text-teal-900 dark:bg-teal-500/30 dark:text-teal-100", price: "text-teal-700 dark:text-teal-300" },
  { card: "border-indigo-200 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10", badge: "border-transparent bg-indigo-200 text-indigo-900 dark:bg-indigo-500/30 dark:text-indigo-100", price: "text-indigo-700 dark:text-indigo-300" },
  { card: "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10", badge: "border-transparent bg-rose-200 text-rose-900 dark:bg-rose-500/30 dark:text-rose-100", price: "text-rose-700 dark:text-rose-300" },
  { card: "border-cyan-200 bg-cyan-50 dark:border-cyan-500/30 dark:bg-cyan-500/10", badge: "border-transparent bg-cyan-200 text-cyan-900 dark:bg-cyan-500/30 dark:text-cyan-100", price: "text-cyan-700 dark:text-cyan-300" },
  { card: "border-lime-200 bg-lime-50 dark:border-lime-500/30 dark:bg-lime-500/10", badge: "border-transparent bg-lime-200 text-lime-900 dark:bg-lime-500/30 dark:text-lime-100", price: "text-lime-700 dark:text-lime-300" },
  { card: "border-fuchsia-200 bg-fuchsia-50 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10", badge: "border-transparent bg-fuchsia-200 text-fuchsia-900 dark:bg-fuchsia-500/30 dark:text-fuchsia-100", price: "text-fuchsia-700 dark:text-fuchsia-300" },
];
function categoryTint(cat?: string | null) {
  if (!cat) return { card: "border-border bg-card", badge: "", price: "text-primary" };
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0;
  return CATEGORY_TINTS[h % CATEGORY_TINTS.length];
}

type Service = { id: string; title: string; description: string | null; price: number | null; category: string | null };
type ProviderProfile = { id: string; full_name: string | null; name: string; avatar_url: string | null };

const sidebarItems = [
  { to: "/dashboard/provider", label: "Tableau de bord", icon: LayoutDashboard },
  
  { to: "/dashboard/provider/portfolio", label: "Portfolio", icon: FolderKanban },
  { to: "/dashboard/provider/projects", label: "Marketplace", icon: Briefcase },
  { to: "/dashboard/provider/kyc", label: "KYC", icon: FileCheck },
  { to: "/messages", label: "Messagerie", icon: MessageSquare },
];

export function ProviderServicesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [svcOpen, setSvcOpen] = useState(false);
  const [svcForm, setSvcForm] = useState({ title: "", description: "", price: "", category: "" });

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [loading, user, navigate]);

  const load = async () => {
    if (!user) return;
    const [{ data: pr }, { data: sv }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,name,avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("services").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setProfile(pr as ProviderProfile);
    setServices((sv ?? []) as Service[]);
  };

  useEffect(() => { if (user?.id) load(); }, [user?.id]);

  const submitService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!svcForm.title.trim()) return toast.error("Titre requis");
    const { error } = await supabase.from("services").insert({
      user_id: user.id,
      title: svcForm.title,
      description: svcForm.description || null,
      price: svcForm.price ? Number(svcForm.price) : null,
      category: svcForm.category || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Service ajouté");
    setSvcOpen(false);
    setSvcForm({ title: "", description: "", price: "", category: "" });
    load();
  };

  const removeService = async (id: string) => {
    if (!confirm("Supprimer ce service ?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (!error) { toast.success("Supprimé"); load(); } else toast.error(error.message);
  };

  if (loading || !user) return null;

  return (
    <DashboardLayout
      title="Mes jobs"
      items={sidebarItems}
      hideSearch
      user={{
        name: profile?.full_name ?? profile?.name ?? user.email ?? "Prestataire",
        role: "Prestataire",
        avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.name || user.email || "P")}&backgroundColor=ea7c2c`,
      }}
    >
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Catalogue de jobs</h2>
            <p className="text-sm text-muted-foreground">Créez les prestations que vous proposez. Elles apparaissent dans la marketplace lorsque votre visibilité est active.</p>
          </div>
          <Dialog open={svcOpen} onOpenChange={setSvcOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="mr-2 h-4 w-4" /> Nouveau job</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ajouter un job</DialogTitle></DialogHeader>
              <form onSubmit={submitService} className="space-y-3">
                <div className="space-y-2"><Label>Titre *</Label><Input required value={svcForm.title} onChange={(e) => setSvcForm({ ...svcForm, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea rows={3} value={svcForm.description} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Prix (FCFA)</Label><Input type="number" value={svcForm.price} onChange={(e) => setSvcForm({ ...svcForm, price: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select value={svcForm.category} onValueChange={(v) => setSvcForm({ ...svcForm, category: v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter><Button type="submit">Ajouter</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {services.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucun job. Ajoutez votre première prestation pour apparaître dans la marketplace.
          </div>
        )}
        {services.map((s) => {
          const tint = categoryTint(s.category);
          return (
            <div key={s.id} className={`rounded-xl border p-4 shadow-[var(--shadow-card)] ${tint.card}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{s.title}</h3>
                  {s.category && <Badge variant="outline" className={`mt-1 capitalize ${tint.badge}`}>{s.category}</Badge>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeService(s.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              {s.description && <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>}
              {s.price && <div className={`mt-2 font-semibold ${tint.price}`}>{s.price.toLocaleString()} FCFA</div>}
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
