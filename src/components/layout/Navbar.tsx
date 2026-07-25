import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HardHat, Menu, User } from "lucide-react";
import { useState } from "react";
import { useAuth, dashboardPathFor } from "@/context/AuthContext";
import { NotificationsBell } from "@/components/NotificationsBell";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardPath = role ? dashboardPathFor(role) : "/dashboard/client";

  let links: { to: string; label: string }[];
  if (role === "provider") {
    links = [
      { to: dashboardPath, label: "Mon espace" },
      { to: "/dashboard/provider/projects", label: "Marketplace" },
      { to: "/messages", label: "Messages" },
    ];
  } else if (role === "admin") {
    links = [
      { to: dashboardPath, label: "Administration" },
      { to: "/messages", label: "Messages" },
    ];
  } else {
    links = [
      { to: "/services", label: "Services" },
      { to: "/contact", label: "Contact" },
      ...(isAuthenticated ? [{ to: dashboardPath, label: "Mon espace" }, { to: "/messages", label: "Messages" }] : []),
    ];
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <HardHat className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">WARAP</span>
          {role && <span className="ml-2 hidden rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase text-primary md:inline-block">{role === "provider" ? "Prestataire" : role === "admin" ? "Admin" : "Utilisateur"}</span>}
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const isActive = location.pathname === l.to || (l.to !== "/" && location.pathname.startsWith(l.to));
            return (
              <NavLink
                key={l.to}
                to={l.to}
                className={() => `rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground ${isActive ? "bg-accent text-foreground" : "text-muted-foreground"}`}
              >
                {l.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              <NotificationsBell />
              <Button asChild variant="ghost"><Link to="/profile"><User className="mr-2 h-4 w-4" />Profil</Link></Button>
              <Button variant="outline" onClick={handleLogout}>Déconnexion</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost"><Link to="/login">Connexion</Link></Button>
              <Button asChild><Link to="/register">S'inscrire</Link></Button>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="menu">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-accent">
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              {isAuthenticated ? (
                <>
                  <Button asChild variant="outline" className="flex-1"><Link to="/profile" onClick={() => setOpen(false)}>Profil</Link></Button>
                  <Button className="flex-1" onClick={() => { setOpen(false); handleLogout(); }}>Déconnexion</Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" className="flex-1"><Link to="/login" onClick={() => setOpen(false)}>Connexion</Link></Button>
                  <Button asChild className="flex-1"><Link to="/register" onClick={() => setOpen(false)}>S'inscrire</Link></Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
