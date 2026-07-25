import { useNavigate, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categories } from "@/lib/mock-data";
import { HardHat } from "lucide-react";
import { toast } from "sonner";

const ALLOWED = new Set(categories.map((c) => c.id));

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const initialized = useRef(false);

  // Pré-remplit la catégorie depuis l'intention d'inscription (Google) — une seule fois
  useEffect(() => {
    if (initialized.current) return;
    if (loading) return;
    if (!user) { navigate("/login"); return; }
    initialized.current = true;
    supabase
      .from("profiles")
      .select("provider_category")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.provider_category && ALLOWED.has(data.provider_category)) {
          navigate("/dashboard/provider", { replace: true });
        }
      });
    try {
      const pending = JSON.parse(sessionStorage.getItem("pending_signup") ?? "null") as { role?: string; providerCategory?: string } | null;
      if (pending?.role === "provider" && pending.providerCategory && ALLOWED.has(pending.providerCategory)) {
        setCategory(pending.providerCategory);
      }
    } catch {}
  }, [user, loading, navigate]);

  const submit = async () => {
    if (!category || !ALLOWED.has(category)) return toast.error("Veuillez sélectionner une catégorie valide");
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.rpc("complete_provider_onboarding", { _category: category });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    try { sessionStorage.removeItem("pending_signup"); } catch {}
    toast.success("Profil finalisé");
    navigate("/dashboard/provider", { replace: true });
  };


  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><HardHat className="h-5 w-5" /></span>
            <span className="font-display text-xl font-bold">WARAP</span>
          </Link>
        </div>
      </header>
      <div className="container mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-3xl font-bold">Finalisez votre profil prestataire</h1>
        <p className="mt-2 text-muted-foreground">Sélectionnez votre catégorie de service principale pour apparaître dans le bon métier BTP.</p>
        <div className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="space-y-2">
            <Label>Catégorie de service <span className="text-destructive">*</span></Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Sélectionnez votre métier BTP" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="lg" className="w-full" onClick={submit} disabled={busy}>{busy ? "Enregistrement…" : "Continuer"}</Button>
        </div>
      </div>
    </div>
  );
}
