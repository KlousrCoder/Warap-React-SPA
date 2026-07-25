import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LayoutDashboard, FolderKanban, MessageSquare, Bell, Plus, Trash2, Image as ImageIcon, GraduationCap, ShieldCheck, ShieldAlert, Clock, FileText, Wrench, FileCheck, Briefcase } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { categories } from "@/lib/mock-data";
import { randomBadgeColor, readableFg, VERIFIED_BADGE_COLOR } from "@/lib/badges";
import { ProviderBadges } from "@/components/ProviderBadges";

type Portfolio = { id: string; title: string; description: string | null; image_url: string | null; category: string | null; completed_at: string | null; location: string | null; status: string; notes: string | null };
type Diploma = { id: string; title: string; institution: string | null; year: number | null; document_url: string | null; document_path: string | null; badge_color: string; status: string; notes: string | null; created_at: string };
type ProviderProfile = { id: string; full_name: string | null; name: string; avatar_url: string | null };

const sidebarItems = [
  { to: "/dashboard/provider", label: "Tableau de bord", icon: LayoutDashboard },
  
  { to: "/dashboard/provider/portfolio", label: "Portfolio", icon: FolderKanban },
  { to: "/dashboard/provider/projects", label: "Marketplace", icon: Briefcase },
  { to: "/dashboard/provider/kyc", label: "KYC", icon: FileCheck },
  { to: "/messages", label: "Messagerie", icon: MessageSquare },
];

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Une erreur est survenue";

const sanitizeFileName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
  reader.readAsDataURL(file);
});

export function ProviderPortfolio() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [diplomas, setDiplomas] = useState<Diploma[]>([]);
  const [kycApproved, setKycApproved] = useState(false);

  const [pfOpen, setPfOpen] = useState(false);
  const [pfForm, setPfForm] = useState({ title: "", description: "", category: "", completed_at: "", location: "" });
  const [pfFile, setPfFile] = useState<File | null>(null);
  const [pfSaving, setPfSaving] = useState(false);

  const [dipOpen, setDipOpen] = useState(false);
  const [dipForm, setDipForm] = useState({ title: "", institution: "", year: "" });
  const [dipFile, setDipFile] = useState<File | null>(null);
  const [dipSaving, setDipSaving] = useState(false);

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [loading, user, navigate]);

  const load = async () => {
    if (!user) return;
    try {
      const [profileResult, portfolioResult, diplomaResult, kycResult] = await Promise.all([
        supabase.from("profiles").select("id,full_name,name,avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("portfolio").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        (supabase.from("diplomas" as never) as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("kyc_submissions").select("status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const firstError = profileResult.error || portfolioResult.error || diplomaResult.error || kycResult.error;
      if (firstError) throw firstError;

      const diplomasWithUrls = await Promise.all(((diplomaResult.data ?? []) as Diploma[]).map(async (d) => {
        if (!d.document_path) return d;
        const { data } = await supabase.storage.from("diplomas").createSignedUrl(d.document_path, 60 * 60);
        return { ...d, document_url: data?.signedUrl ?? d.document_url };
      }));

      setProfile(profileResult.data as ProviderProfile);
      setPortfolio((portfolioResult.data ?? []) as Portfolio[]);
      setDiplomas(diplomasWithUrls);
      setKycApproved(kycResult.data?.status === "approved");
    } catch (error) {
      toast.error("Chargement impossible : " + getErrorMessage(error));
    }
  };

  useEffect(() => { if (user?.id) load(); }, [user?.id]);

  // ------- Portfolio handlers -------
  const uploadPfImage = async (file: File): Promise<string> => {
    if (!user) throw new Error("Vous devez être connecté");
    if (!file.type.startsWith("image/")) throw new Error("Le fichier de réalisation doit être une image");
    if (file.size > 10 * 1024 * 1024) throw new Error("Image trop volumineuse (max 10 Mo)");
    try {
    const safeName = sanitizeFileName(file.name);
    const path = `${user.id}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("portfolio").upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return supabase.storage.from("portfolio").getPublicUrl(path).data.publicUrl;
    } catch {
      return fileToDataUrl(file);
    }
  };

  const submitPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!pfForm.title.trim()) return toast.error("Titre requis");
    if (!pfFile) return toast.error("Veuillez joindre une photo");
    setPfSaving(true);
    try {
      const imageUrl = await uploadPfImage(pfFile);
      const { error } = await supabase.from("portfolio").insert({
        user_id: user.id,
        title: pfForm.title,
        description: pfForm.description || null,
        image_url: imageUrl,
        category: pfForm.category || null,
        completed_at: pfForm.completed_at || null,
        location: pfForm.location || null,
      });
      if (error) throw error;
      toast.success("Réalisation ajoutée");
      setPfOpen(false);
      setPfForm({ title: "", description: "", category: "", completed_at: "", location: "" });
      setPfFile(null);
      await load();
    } catch (error) {
      toast.error("Envoi impossible : " + getErrorMessage(error));
    } finally {
      setPfSaving(false);
    }
  };

  const removePortfolio = async (id: string) => {
    if (!confirm("Supprimer cette réalisation ?")) return;
    const { error } = await supabase.from("portfolio").delete().eq("id", id);
    if (!error) { toast.success("Supprimé"); load(); } else toast.error(error.message);
  };

  // ------- Diploma handlers -------
  const submitDiploma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!dipForm.title.trim()) return toast.error("Titre requis");
    if (!dipFile) return toast.error("Veuillez joindre le document du diplôme");
    if (dipFile.size > 15 * 1024 * 1024) return toast.error(`Fichier trop volumineux (${(dipFile.size / 1024 / 1024).toFixed(1)} Mo). Maximum 15 Mo.`);
    if (!dipFile.type.startsWith("image/") && dipFile.type !== "application/pdf") return toast.error("Format accepté : image (JPG, PNG) ou PDF");
    setDipSaving(true);
    try {
      let documentUrl: string | null = null;
      let documentPath: string | null = null;
      try {
        const safeName = sanitizeFileName(dipFile.name);
        const path = `${user.id}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from("diplomas").upload(path, dipFile, { upsert: true, contentType: dipFile.type });
        if (upErr) throw upErr;
        documentPath = path;
      } catch {
        documentUrl = await fileToDataUrl(dipFile);
      }
      const yearN = dipForm.year ? Number(dipForm.year) : null;
      const { error } = await (supabase.from("diplomas" as never) as any).insert({
        user_id: user.id,
        title: dipForm.title,
        institution: dipForm.institution || null,
        year: yearN && yearN > 1900 && yearN < 2100 ? yearN : null,
        document_url: documentUrl,
        document_path: documentPath,
        badge_color: randomBadgeColor(),
        status: "pending",
      });
      if (error) throw error;
      toast.success("Diplôme soumis. En attente de validation par un administrateur.");
      setDipOpen(false);
      setDipForm({ title: "", institution: "", year: "" });
      setDipFile(null);
      await load();
    } catch (error) {
      toast.error("Envoi impossible : " + getErrorMessage(error));
    } finally {
      setDipSaving(false);
    }
  };

  const removeDiploma = async (id: string) => {
    if (!confirm("Supprimer ce diplôme ?")) return;
    const { error } = await (supabase.from("diplomas" as never) as any).delete().eq("id", id);
    if (!error) { toast.success("Supprimé"); load(); } else toast.error(error.message);
  };

  if (loading || !user) return null;

  const approvedDiplomas = diplomas.filter((d) => d.status === "approved");

  return (
    <DashboardLayout
      title="Portfolio"
      items={sidebarItems}
      hideSearch
      user={{
        name: profile?.full_name ?? profile?.name ?? user.email ?? "Prestataire",
        role: "Prestataire",
        avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.name || user.email || "P")}&backgroundColor=ea7c2c`,
      }}
    >
      {/* Header: badges actifs */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Mes badges</h2>
            <p className="text-sm text-muted-foreground">
              Le badge <span className="font-semibold" style={{ color: VERIFIED_BADGE_COLOR }}>Vérifié</span> apparaît dès que votre KYC est validé.
              Chaque diplôme et chaque réalisation approuvés par l'administration ajoutent un badge à votre profil public.
            </p>
          </div>
          <ProviderBadges
            verified={kycApproved}
            diplomas={approvedDiplomas.map((d) => ({ id: d.id, title: d.title, badge_color: d.badge_color }))}
            worksCount={portfolio.filter((p) => p.status === "approved").length}
          />
        </div>
        {(!kycApproved && approvedDiplomas.length === 0 && portfolio.filter((p) => p.status === "approved").length === 0) && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
            Vous n'avez encore aucun badge. Validez votre KYC, soumettez un diplôme et ajoutez vos réalisations pour qu'elles soient validées.
          </p>
        )}
      </section>

      <Tabs defaultValue="works" className="mt-6">
        <TabsList>
          <TabsTrigger value="works"><ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Réalisations</TabsTrigger>
          <TabsTrigger value="diplomas"><GraduationCap className="mr-1.5 h-3.5 w-3.5" /> Diplômes {diplomas.length > 0 && <Badge variant="secondary" className="ml-2">{diplomas.length}</Badge>}</TabsTrigger>
        </TabsList>

        {/* ============= Réalisations ============= */}
        <TabsContent value="works" className="mt-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Présentez vos prestations passées avec photos, description, date et lieu.</p>
            <Dialog open={pfOpen} onOpenChange={setPfOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nouvelle réalisation</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter une réalisation</DialogTitle>
                  <DialogDescription>Renseignez les détails et joignez une photo de votre prestation.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submitPortfolio} className="space-y-3">
                  <div className="space-y-2"><Label htmlFor="pf-title">Titre *</Label><Input id="pf-title" required value={pfForm.title} onChange={(e) => setPfForm({ ...pfForm, title: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="pf-description">Description</Label><Textarea id="pf-description" rows={3} value={pfForm.description} onChange={(e) => setPfForm({ ...pfForm, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="pf-category">Catégorie</Label>
                      <Select value={pfForm.category} onValueChange={(v) => setPfForm({ ...pfForm, category: v })}>
                        <SelectTrigger id="pf-category"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label htmlFor="pf-date">Date</Label><Input id="pf-date" type="date" value={pfForm.completed_at} onChange={(e) => setPfForm({ ...pfForm, completed_at: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="pf-location">Lieu</Label><Input id="pf-location" placeholder="Ex: Yaoundé, Bastos" value={pfForm.location} onChange={(e) => setPfForm({ ...pfForm, location: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label htmlFor="pf-image">Image *</Label>
                    <Input id="pf-image" type="file" accept="image/*" onChange={(e) => setPfFile(e.target.files?.[0] ?? null)} />
                    {pfFile && <p className="text-xs text-muted-foreground">📎 {pfFile.name}</p>}
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={pfSaving}>
                      {pfSaving ? "Envoi…" : "Ajouter"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.length === 0 && <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Portfolio vide. Ajoutez vos plus belles réalisations.</div>}
            {portfolio.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
                {p.image_url ? <img src={p.image_url} alt={p.title} className="aspect-[4/3] w-full object-cover" /> :
                  <div className="grid aspect-[4/3] place-items-center bg-muted text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{p.title}</div>
                      <div className="mt-0.5 flex flex-wrap gap-1 text-xs text-muted-foreground">
                        {p.category && <Badge variant="outline" className="text-[10px]">{p.category}</Badge>}
                        {p.location && <span>· {p.location}</span>}
                        {p.completed_at && <span>· {new Date(p.completed_at).toLocaleDateString("fr-FR")}</span>}
                      </div>
                      {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
                      <div className="mt-2">
                        {p.status === "approved" && <Badge className="bg-green-600 text-white hover:bg-green-700"><ShieldCheck className="mr-1 h-3 w-3" /> Validée</Badge>}
                        {p.status === "pending" && <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> En attente</Badge>}
                        {p.status === "rejected" && <Badge variant="destructive"><ShieldAlert className="mr-1 h-3 w-3" /> Refusée</Badge>}
                      </div>
                      {p.status === "rejected" && p.notes && (
                        <p className="mt-1 text-xs text-destructive">Motif : {p.notes}</p>
                      )}
                    </div>
                    {p.status === "pending" && (
                      <Button size="icon" variant="ghost" onClick={() => removePortfolio(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ============= Diplômes ============= */}
        <TabsContent value="diplomas" className="mt-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Téléversez un diplôme ou un certificat. Une fois validé par un administrateur, un <b>badge coloré unique</b> sera ajouté à votre profil public.
            </p>
            <Dialog open={dipOpen} onOpenChange={setDipOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Ajouter un diplôme</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouveau diplôme / certification</DialogTitle>
                  <DialogDescription>Ajoutez le diplôme à faire valider par l’équipe d’administration.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submitDiploma} className="space-y-3">
                  <div className="space-y-2"><Label htmlFor="dip-title">Intitulé du diplôme *</Label><Input id="dip-title" required placeholder="Ex: BTS Génie Civil" value={dipForm.title} onChange={(e) => setDipForm({ ...dipForm, title: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label htmlFor="dip-institution">Établissement</Label><Input id="dip-institution" placeholder="Ex: ENSP Yaoundé" value={dipForm.institution} onChange={(e) => setDipForm({ ...dipForm, institution: e.target.value })} /></div>
                    <div className="space-y-2"><Label htmlFor="dip-year">Année</Label><Input id="dip-year" type="number" min={1950} max={new Date().getFullYear()} value={dipForm.year} onChange={(e) => setDipForm({ ...dipForm, year: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dip-document">Document du diplôme *</Label>
                    <Input id="dip-document" type="file" accept="image/*,application/pdf" onChange={(e) => setDipFile(e.target.files?.[0] ?? null)} />
                    <p className="text-xs text-muted-foreground">Image ou PDF, max 15 Mo. Document privé, visible uniquement par les administrateurs.</p>
                    {dipFile && <p className="text-xs text-muted-foreground">📎 {dipFile.name}</p>}
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={dipSaving}>
                      {dipSaving ? "Envoi…" : "Soumettre pour validation"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {diplomas.length === 0 && <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aucun diplôme. Ajoutez votre premier diplôme pour obtenir un badge coloré.</div>}
            {diplomas.map((d) => (
              <div key={d.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                        style={{ backgroundColor: d.badge_color, color: readableFg(d.badge_color) }}
                      >
                        <GraduationCap className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{d.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {d.institution ?? "—"}{d.year ? ` · ${d.year}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {d.status === "approved" && <Badge className="bg-green-600 text-white hover:bg-green-700"><ShieldCheck className="mr-1 h-3 w-3" /> Validé</Badge>}
                      {d.status === "pending" && <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> En attente</Badge>}
                      {d.status === "rejected" && <Badge variant="destructive"><ShieldAlert className="mr-1 h-3 w-3" /> Refusé</Badge>}
                      {d.document_url && (
                        <a href={d.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <FileText className="h-3 w-3" /> Document
                        </a>
                      )}
                    </div>
                    {d.notes && d.status === "rejected" && (
                      <p className="mt-2 text-xs text-destructive">Motif : {d.notes}</p>
                    )}
                  </div>
                  {d.status === "pending" && (
                    <Button size="icon" variant="ghost" onClick={() => removeDiploma(d.id)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6 text-center">
        <Link to="/dashboard/provider" className="text-sm text-muted-foreground hover:text-foreground">← Retour au tableau de bord</Link>
      </div>
    </DashboardLayout>
  );
}
