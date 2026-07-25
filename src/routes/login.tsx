import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { HardHat } from "lucide-react";
import { useState } from "react";
import { useAuth, dashboardPathFor } from "@/context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("Veuillez remplir tous les champs");
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    navigate(dashboardPathFor(res.role));
  };

  const handleGoogle = async () => {
    setError("");
    const res = await googleLogin();
    if (!res.ok) setError(res.error);
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between p-10 text-white md:flex" style={{ background: "var(--gradient-hero)" }}>
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary"><HardHat className="h-5 w-5" /></span>
          <span className="font-display text-xl font-bold">WARAP</span>
        </Link>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight">"WARAP a transformé ma façon de trouver des chantiers."</h2>
          <div className="mt-6 text-white/70">— Mamadou D., Plombier à Yaoundé</div>
        </div>
        <div className="text-sm text-white/50">© 2026 WARAP</div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-bold">Bon retour 👋</h1>
          <p className="mt-2 text-muted-foreground">Connectez-vous à votre compte WARAP.</p>
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="vous@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Mot de passe</Label>
              <PasswordInput id="pw" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
            <Button className="w-full" size="lg" type="submit" disabled={busy}>{busy ? "Connexion..." : "Se connecter"}</Button>
            
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Pas encore de compte ? <Link to="/register" className="font-medium text-primary hover:underline">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
