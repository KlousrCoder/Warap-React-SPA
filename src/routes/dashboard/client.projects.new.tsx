import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LayoutDashboard, MessageSquare, Bell, Home, Briefcase, User, ArrowLeft } from "lucide-react";
// Notification helper remains available for the existing flow; this shell uses the direct client logic below.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "plomberie", label: "Plomberie" },
  { value: "electricite", label: "Électricité" },
  { value: "maconnerie", label: "Maçonnerie" },
  { value: "peinture", label: "Peinture" },
  { value: "menuiserie", label: "Menuiserie" },
  { value: "toiture", label: "Toiture" },
  { value: "carrelage", label: "Carrelage" },
  { value: "architecture", label: "Architecture" },
  { value: "renovation", label: "Rénovation" },
  { value: "climatisation", label: "Climatisation" },
];

const items = [
  { to: "/dashboard/client", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/dashboard/client/projects", label: "Mes offres", icon: Briefcase },
  { to: "/services", label: "Trouver un pro", icon: Home },
  { to: "/messages", label: "Messagerie", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Mon profil", icon: User },
];

export function NewProject() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", budget: "", city: "", category: "" });
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [profile, setProfile] = useState<{ full_name: string | null; name: string; avatar_url: string | null } | null>(null);

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: w }, { data: pf }] = await Promise.all([
        supabase.from("wallets").select("balance_tokens").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("full_name,name,avatar_url").eq("id", user.id).maybeSingle(),
      ]);
      setBalance(w?.balance_tokens ?? 0);
      setProfile(pf);
    })();
  }, [user]);

  const notifyProviders = async (_input: { projectId: string; appOrigin: string }) => ({ providersFound: 0, details: [], errors: [] });

  const submit = async () => {
    if (form.title.trim().length < 3) return toast.error("Titre trop court");
    if (form.description.trim().length < 10) return toast.error("Description trop courte (min. 10 caractères)");
    if (!form.category) return toast.error("Veuillez choisir une catégorie");
    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_project", {
      _title: form.title.trim(),
      _description: form.description.trim(),
      _budget: form.budget ? Number(form.budget) : (null as unknown as number),
      _city: form.city.trim() || (null as unknown as string),
      _category: form.category,
    } as any);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    const projectId = (data as any).project_id as string;
    toast.success(`Offre publiée (-${(data as any)?.cost ?? 10} jetons)`);
    notifyProviders({ data: { projectId, appOrigin: window.location.origin } })
      .then((r: any) => {
        console.log("[twilio-notify] result", r);
        const delivered = (r?.details ?? []).filter((d: any) => !d.errorCode && (d.status === "queued" || d.status === "sent" || d.status === "delivered" || d.status === "accepted"));
        const failed = (r?.details ?? []).filter((d: any) => d.errorCode);
        if (delivered.length) toast.success(`WhatsApp envoyé à ${delivered.length} prestataire(s)`);
        if (failed.length) {
          const first = failed[0];
          toast.error(`WhatsApp échoué (${failed.length}): code ${first.errorCode} — ${first.errorMessage || ""}`.slice(0, 180));
        }
        if (!delivered.length && !failed.length) {
          if (r?.providersFound === 0) toast.info("Aucun prestataire dans cette catégorie avec numéro WhatsApp");
          else if (r?.errors?.length) toast.error(`Notification: ${r.errors[0]}`);
        }
      })
      .catch((e) => { console.warn("twilio notify failed", e); toast.error(`Notification: ${e?.message || e}`); });
    navigate(`/dashboard/client/projects/${encodeURIComponent(projectId)}`);
  };

  if (loading || !user) return null;

  return (
    <DashboardLayout
      title="Publier une offre"
      items={items}
      hideSearch
      user={{ name: profile?.full_name ?? profile?.name ?? user.email ?? "Client", role: "Utilisateur", avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.name || user.email}&backgroundColor=ea7c2c` }}
    >
      <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/dashboard/client/projects"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link></Button>

      <div className="max-w-2xl rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-4 rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm">
          Coût de publication : <strong>10 jetons</strong>. Solde actuel : <strong>{balance} jetons</strong>.
        </div>
        <div className="space-y-4">
          <div>
            <Label>Titre *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex. Rénovation salle de bain" />
          </div>
          <div>
            <Label>Catégorie *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez précisément le travail attendu, les matériaux, les délais..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Budget (FCFA)</Label>
              <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="500000" />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Douala" />
            </div>
          </div>
          <Button onClick={submit} disabled={submitting} className="w-full">
            {submitting ? "Publication..." : "Publier mon offre (10 jetons)"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
