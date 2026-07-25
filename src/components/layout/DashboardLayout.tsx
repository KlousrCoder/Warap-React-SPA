import { Link, useLocation, useNavigate } from "react-router-dom";
import { HardHat, Bell, Search, Menu, Home, LogOut, User, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";

export type SidebarItem = { to: string; label: string; icon: LucideIcon };

export function DashboardLayout({
  title,
  items,
  user,
  children,
  hideSearch,
}: {
  title: string;
  items: SidebarItem[];
  user: { name: string; role: string; avatar: string };
  children: React.ReactNode;
  hideSearch?: boolean;
}) {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const renderNav = (onClick?: () => void) => (
    <nav className="flex-1 space-y-0.5 px-3 py-4">
      <Link
        to="/"
        onClick={onClick}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Home className="h-4 w-4" />
        Accueil
      </Link>
      {items.map((it) => {
        const active = pathname === it.to;
        return (
          <Link
            key={it.to}
            to={it.to}
            onClick={onClick}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );

  const renderFooter = (onClick?: () => void) => (
    <div className="border-t border-sidebar-border p-4 space-y-3">
      <Link
        to="/profile"
        onClick={onClick}
        className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent"
      >
        <img src={user.avatar} alt={user.name} className="h-9 w-9 rounded-full" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{user.name}</div>
          <div className="text-xs text-sidebar-foreground/60">{user.role}</div>
        </div>
      </Link>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => { onClick?.(); handleLogout(); }}
      >
        <LogOut className="mr-2 h-4 w-4" /> Déconnexion
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/" className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <HardHat className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-bold">WARAP</span>
        </Link>
        {renderNav()}
        {renderFooter()}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="grid h-9 w-9 place-items-center rounded-md border border-border hover:bg-accent md:hidden" aria-label="Menu">
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
              <SheetHeader className="border-b border-sidebar-border p-4 text-left">
                <SheetTitle className="flex items-center gap-2 text-sidebar-foreground">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
                    <HardHat className="h-4 w-4" />
                  </span>
                  WARAP
                </SheetTitle>
              </SheetHeader>
              <div className="flex h-[calc(100%-4rem)] flex-col">
                {renderNav(() => setMobileOpen(false))}
                {renderFooter(() => setMobileOpen(false))}
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="min-w-0 flex-1 truncate font-display text-base font-semibold sm:text-lg md:flex-none">{title}</h1>
          {!hideSearch && (
            <div className="relative ml-auto hidden w-72 md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher…" className="pl-9" />
            </div>
          )}
          <Link to="/" className="hidden items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent md:inline-flex">
            <Home className="h-4 w-4" /> Accueil
          </Link>
          <Link to="/notifications" aria-label="Notifications" className="relative grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border hover:bg-accent">
            <Bell className="h-4 w-4" />
          </Link>
          <Link to="/profile" aria-label="Profil" className="hidden md:grid h-9 w-9 place-items-center rounded-md border border-border hover:bg-accent">
            <User className="h-4 w-4" />
          </Link>
          <Link to="/profile" aria-label="Profil" className="shrink-0 md:hidden">
            <img src={user.avatar} className="h-9 w-9 rounded-full" alt="" />
          </Link>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({ label, value, delta, icon: Icon, to }: { label: string; value: string; delta?: string; icon: LucideIcon; to?: string }) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 font-display text-2xl font-bold">{value}</div>
      {delta && <div className="mt-1 text-xs text-success">{delta}</div>}
    </>
  );
  if (to) {
    return (
      <Link to={to} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] block transition-colors hover:border-primary/40 hover:bg-accent/40">
        {inner}
      </Link>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      {inner}
    </div>
  );
}
