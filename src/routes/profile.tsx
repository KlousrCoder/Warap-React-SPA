import { useNavigate, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, LayoutDashboard, Camera, ImagePlus } from "lucide-react";
import { categories } from "@/lib/mock-data";
import { ProviderBadges, type DiplomaBadge } from "@/components/ProviderBadges";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";

const DEFAULT_COVER = "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1600&q=80";

export function ProfilePage() {
  const { user, role, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", phone: "", city: "", bio: "", avatar_url: "", cover_url: "", provider_category: "" });
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [kycValid, setKycValid] = useState(false);
  const [diplomaBadges, setDiplomaBadges] = useState<DiplomaBadge[]>([]);
  const [worksCount, setWorksCount] = useState(0);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        const d = data as Record<string, any>;
        setForm({
          full_name: d.full_name ?? d.name ?? "",
          phone: d.phone ?? "",
          city: d.city ?? "",
          bio: d.bio ?? "",
          avatar_url: d.avatar_url ?? "",
          cover_url: d.cover_url ?? "",
          provider_category: d.provider_category ?? "",
        });
        setEmail(d.email ?? user.email ?? "");
        setKycValid(d.kyc_status === "valid");
      }
      setBusy(false);
    });
    (async () => {
      const [{ data: dip }, { count }] = await Promise.all([
        (supabase.from("diplomas" as never) as any).select("id,title,badge_color").eq("user_id", user.id).eq("status", "approved"),
        supabase.from("portfolio").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "approved"),
      ]);
      setDiplomaBadges((dip ?? []) as DiplomaBadge[]);
      setWorksCount(count ?? 0);
    })();
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name, name: form.full_name, phone: form.phone, city: form.city, bio: form.bio,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profil mis à jour");
  };

  const onAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Veuillez sélectionner une image");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image trop volumineuse (max 5 Mo)");
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatarBlob = async (blob: Blob) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (updErr) throw updErr;
      setForm((f) => ({ ...f, avatar_url: publicUrl }));
      setCropSrc(null);
      toast.success("Photo de profil mise à jour");
    } catch (err: any) {
      toast.error(err?.message || "Échec du téléversement");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("Veuillez sélectionner une image");
    if (file.size > 8 * 1024 * 1024) return toast.error("Image trop volumineuse (max 8 Mo)");
    setUploadingCover(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/cover-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      const { error: updErr } = await supabase.from("profiles").update({ cover_url: publicUrl } as never).eq("id", user.id);
      if (updErr) throw updErr;
      setForm((f) => ({ ...f, cover_url: publicUrl }));
      toast.success("Photo de couverture mise à jour");
    } catch (err: any) {
      toast.error(err?.message || "Échec du téléversement");
    } finally {
      setUploadingCover(false);
    }
  };

  if (loading || busy) return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto px-4 py-12">Chargement…</div></div>;

  const dashboardPath = role === "provider" ? "/dashboard/provider" : role === "admin" ? "/dashboard/admin" : "/dashboard/client";
  const avatarSrc = form.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(form.full_name || email || "U")}&backgroundColor=ea7c2c`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Link to={dashboardPath} className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour au tableau de bord
        </Link>

        {/* Cover + avatar */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="relative h-44 w-full bg-muted md:h-56">
            <img src={form.cover_url || DEFAULT_COVER} alt="Couverture" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/75 disabled:opacity-60"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {uploadingCover ? "Téléversement…" : form.cover_url ? "Changer la couverture" : "Ajouter une couverture"}
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={onCoverFile} />
          </div>

          <div className="px-5 pb-5">
            <div className="-mt-12 flex items-end justify-between">
              <div className="relative">
                <img src={avatarSrc} alt="Photo de profil" className="h-24 w-24 rounded-full border-4 border-card object-cover shadow-lg" />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-white shadow ring-2 ring-card hover:bg-orange-700 disabled:opacity-60"
                  title="Changer la photo de profil"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarFile} />
              </div>
              <Button variant="outline" size="sm" onClick={async () => { await logout(); navigate("/login"); }}>Déconnexion</Button>
            </div>
            <div className="mt-4">
              <h1 className="font-display text-2xl font-bold">{form.full_name || "Mon profil"}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {role && (
                  <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-sm">
                    {role === "provider" ? "Prestataire" : role === "admin" ? "Admin" : "Utilisateur"}
                  </span>
                )}
                {form.provider_category && (() => {
                  const cat = categories.find((c) => c.id === form.provider_category);
                  return (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {cat?.icon && <span>{cat.icon}</span>}
                      <span>{cat?.name ?? form.provider_category}</span>
                    </span>
                  );
                })()}
              </div>
              {role === "provider" && (
                <div className="mt-3">
                  <ProviderBadges verified={kycValid} diplomas={diplomaBadges} worksCount={worksCount} />
                  {!kycValid && diplomaBadges.length === 0 && worksCount === 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">Aucun badge pour le moment. Validez votre KYC, soumettez des diplômes et faites valider vos réalisations.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={save} className="mt-6 space-y-5 rounded-xl border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Nom complet</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={email} disabled /></div>
            <div className="space-y-2"><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Bio</Label><Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button asChild variant="outline"><Link to={dashboardPath}><LayoutDashboard className="mr-2 h-4 w-4" /> Tableau de bord</Link></Button>
            <Button type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </div>
        </form>
      </main>

      <AvatarCropDialog
        open={!!cropSrc}
        src={cropSrc}
        busy={uploadingAvatar}
        onCancel={() => setCropSrc(null)}
        onConfirm={uploadAvatarBlob}
      />
    </div>
  );
}
