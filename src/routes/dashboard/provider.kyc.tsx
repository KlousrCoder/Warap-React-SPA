import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LayoutDashboard, FolderKanban, MessageSquare, Shield, ShieldCheck, ShieldAlert, Wrench, FileCheck, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Kyc = { id: string; status: string; document_url: string; document_path: string; notes: string | null; created_at: string };
type ProviderProfile = { id: string; full_name: string | null; name: string; avatar_url: string | null };

const sidebarItems = [
  { to: "/dashboard/provider", label: "Tableau de bord", icon: LayoutDashboard },
  
  { to: "/dashboard/provider/portfolio", label: "Portfolio", icon: FolderKanban },
  { to: "/dashboard/provider/projects", label: "Marketplace", icon: Briefcase },
  { to: "/dashboard/provider/kyc", label: "KYC", icon: FileCheck },
  { to: "/messages", label: "Messagerie", icon: MessageSquare },
];

export function ProviderKycPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [kyc, setKyc] = useState<Kyc | null>(null);
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycUploading, setKycUploading] = useState(false);

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [loading, user, navigate]);

  const load = async () => {
    if (!user) return;
    const [{ data: pr }, { data: kc }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,name,avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("kyc_submissions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setProfile(pr as ProviderProfile);
    setKyc((kc as Kyc) ?? null);
  };

  useEffect(() => { if (user?.id) load(); }, [user?.id]);

  const submitKyc = async () => {
    if (!kycFile || !user) return;
    setKycUploading(true);
    try {
      const path = `${user.id}/id-${Date.now()}.${kycFile.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("kyc").upload(path, kycFile, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage.from("kyc").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !signed?.signedUrl) throw new Error("Impossible de générer le lien");
      const { error: dbErr } = kyc
        ? await supabase.from("kyc_submissions").update({ document_url: signed.signedUrl, document_path: path, status: "pending", notes: null }).eq("id", kyc.id)
        : await supabase.from("kyc_submissions").insert({ user_id: user.id, document_url: signed.signedUrl, document_path: path });
      if (dbErr) throw dbErr;
      setKycFile(null);
      toast.success("Pièce envoyée. En attente de validation.");
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Échec de l'envoi");
    } finally {
      setKycUploading(false);
    }
  };

  if (loading || !user) return null;

  return (
    <DashboardLayout
      title="Vérification d'identité (KYC)"
      items={sidebarItems}
      hideSearch
      user={{
        name: profile?.full_name ?? profile?.name ?? user.email ?? "Prestataire",
        role: "Prestataire",
        avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.name || user.email || "P")}&backgroundColor=ea7c2c`,
      }}
    >
      <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-3">
          {kyc?.status === "approved"
            ? <ShieldCheck className="h-7 w-7 text-green-600" />
            : kyc?.status === "rejected"
              ? <ShieldAlert className="h-7 w-7 text-destructive" />
              : <Shield className="h-7 w-7 text-muted-foreground" />}
          <div>
            <h2 className="font-display text-lg font-bold">Statut de votre vérification</h2>
            <p className="text-sm text-muted-foreground">
              {!kyc && "Envoyez votre pièce d'identité pour faire vérifier votre compte."}
              {kyc?.status === "pending" && "Votre pièce est en cours de vérification par notre équipe."}
              {kyc?.status === "approved" && "Votre identité a été vérifiée. Vous pouvez activer votre visibilité."}
              {kyc?.status === "rejected" && "Votre pièce a été refusée. Veuillez en renvoyer une nouvelle."}
            </p>
          </div>
        </div>

        {kyc && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-border p-3 text-sm">
            <div>
              <div>Envoyée le {new Date(kyc.created_at).toLocaleDateString("fr-FR")}</div>
              {kyc.notes && <div className="mt-1 text-xs text-muted-foreground">Note admin : {kyc.notes}</div>}
            </div>
            <Badge variant={kyc.status === "approved" ? "default" : kyc.status === "rejected" ? "destructive" : "secondary"}>
              {kyc.status}
            </Badge>
          </div>
        )}

        {kyc?.status !== "approved" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="kyc-file">{kyc ? "Renvoyer une pièce" : "Téléverser la pièce d'identité"}</Label>
              <Input id="kyc-file" type="file" accept="image/*,application/pdf" disabled={kycUploading} onChange={(e) => setKycFile(e.target.files?.[0] ?? null)} />
              <p className="text-xs text-muted-foreground">CNI, passeport ou permis. Image ou PDF, max 5 Mo. Document privé visible uniquement par les administrateurs.</p>
            </div>
            {kycFile && (
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="truncate max-w-[240px]">{kycFile.name}</Badge>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={submitKyc} disabled={kycUploading}>
                  {kycUploading ? "Envoi…" : "Envoyer ma pièce"}
                </Button>
                <Button variant="ghost" onClick={() => setKycFile(null)} disabled={kycUploading}>Annuler</Button>
              </div>
            )}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
