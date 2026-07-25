import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/ui/password-input";
import { HardHat, User, Wrench } from "lucide-react";
import { useState } from "react";
import { useAuth, dashboardPathFor } from "@/context/AuthContext";
import { categories } from "@/lib/mock-data";
import { countries, validatePassword } from "@/lib/country-codes";
import { toast } from "sonner";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, googleLogin } = useAuth();
  const [role, setRole] = useState<"client" | "provider">("client");
  const [providerCategory, setProviderCategory] = useState<string>("");
  const [dial, setDial] = useState<string>("+237");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirm: "" });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const name = `${form.firstName} ${form.lastName}`.trim();
    if (!name || !form.email || !form.password) return setError("Veuillez remplir tous les champs obligatoires");
    const pwErr = validatePassword(form.password);
    if (pwErr) return setError(pwErr);
    if (form.password !== form.confirm) return setError("Les mots de passe ne correspondent pas");
    if (role === "provider" && !providerCategory) return setError("Veuillez sélectionner votre catégorie de service");
    if (!acceptTerms) return setError("Vous devez accepter les CGU et la politique de confidentialité");
    setBusy(true);
    const res = await register({ name, email: form.email, password: form.password, role, providerCategory: role === "provider" ? providerCategory : undefined });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return setError(res.error); }
    if (res.needsEmailConfirmation) {
      toast.success("Compte créé ! Vérifiez votre boîte mail pour confirmer votre adresse avant de vous connecter.");
      navigate("/login");
      return;
    }
    navigate(dashboardPathFor(res.role));
  };

  const handleGoogle = async () => {
    setError("");
    if (role === "provider" && !providerCategory) return setError("Sélectionnez votre catégorie avant de continuer avec Google");
    if (!acceptTerms) return setError("Vous devez accepter les CGU et la politique de confidentialité avant de continuer");
    try { sessionStorage.setItem("pending_signup", JSON.stringify({ role, providerCategory })); } catch {}
    const res = await googleLogin();
    if (!res.ok) setError(res.error);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><HardHat className="h-5 w-5" /></span>
            <span className="font-display text-xl font-bold">WARAP</span>
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Déjà inscrit ? <span className="font-medium text-primary">Se connecter</span></Link>
        </div>
      </header>

      <div className="container mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-display text-3xl font-bold">Créer votre compte</h1>
        <p className="mt-2 text-muted-foreground">Rejoignez la marketplace BTP du Cameroun.</p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          {([
            { id: "client", icon: User, title: "Je suis client", desc: "Je cherche un pro pour mes travaux." },
            { id: "provider", icon: Wrench, title: "Je suis prestataire", desc: "Je propose mes services BTP." },
          ] as const).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={`rounded-xl border-2 p-5 text-left transition-all ${role === r.id ? "border-primary bg-primary/5 shadow-[var(--shadow-card)]" : "border-border bg-card hover:border-primary/40"}`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-lg ${role === r.id ? "bg-primary text-primary-foreground" : "bg-accent"}`}><r.icon className="h-5 w-5" /></span>
              <div className="mt-3 font-semibold">{r.title}</div>
              <div className="text-sm text-muted-foreground">{r.desc}</div>
            </button>
          ))}
        </div>

        <form className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Prénom</Label><Input placeholder="Aïcha" value={form.firstName} onChange={update("firstName")} /></div>
            <div className="space-y-1.5"><Label>Nom</Label><Input placeholder="Diallo" value={form.lastName} onChange={update("lastName")} /></div>
          </div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="vous@email.com" value={form.email} onChange={update("email")} /></div>
          <div className="space-y-1.5">
            <Label>Téléphone</Label>
            <div className="flex gap-2">
              <Select value={dial} onValueChange={setDial}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.dial}>
                      <span className="mr-2">{c.flag}</span>{c.dial} <span className="text-muted-foreground ml-1">{c.code}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input className="flex-1" placeholder="77 000 00 00" value={form.phone} onChange={update("phone")} />
            </div>
          </div>
          {role === "provider" && (
            <div className="space-y-1.5">
              <Label>Catégorie de service <span className="text-destructive">*</span></Label>
              <Select value={providerCategory} onValueChange={setProviderCategory}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez votre métier BTP" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Obligatoire pour les prestataires.</p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Mot de passe</Label><PasswordInput placeholder="••••••••" value={form.password} onChange={update("password")} /></div>
            <div className="space-y-1.5"><Label>Confirmer</Label><PasswordInput placeholder="••••••••" value={form.confirm} onChange={update("confirm")} /></div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Au moins 8 caractères, 1 majuscule, 1 chiffre et 1 caractère spécial.</p>
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
            <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(v === true)} />
            <Label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground cursor-pointer">
              J'ai lu et j'accepte les{" "}
              <Link to="/cgu" target="_blank" className="text-primary underline">conditions générales d'utilisation</Link>
              {" "}et la{" "}
              <Link to="/confidentialite" target="_blank" className="text-primary underline">politique de confidentialité</Link>.
            </Label>
          </div>
          {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          <Button size="lg" className="w-full" type="submit" disabled={busy}>{busy ? "Création..." : `Créer mon compte ${role === "client" ? "client" : "prestataire"}`}</Button>
          
        </form>
      </div>
    </div>
  );
}
