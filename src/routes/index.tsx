import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState, useRef, useEffect, type ReactElement } from "react";
import { LoginPage } from "@/routes/login";
import { RegisterPage } from "@/routes/register";
import { MarketplacePage } from "@/routes/services.index";
import { ProfilePage } from "@/routes/profile";
import { MessagesPage } from "@/routes/messages";
import { NotificationsPage } from "@/routes/notifications";
import { OnboardingPage } from "@/routes/onboarding";
import { ClientDash } from "@/routes/dashboard/client.index";
import { ProviderDash } from "@/routes/dashboard/provider.index";
import { AdminDash } from "@/routes/dashboard/admin";
import { ProviderPage } from "@/routes/providers.$id";
import { ContactPage } from "@/routes/contact";
import { CguPage } from "@/routes/cgu";
import { PrivacyPage } from "@/routes/confidentialite";
import { ServicesCategoryRedirect } from "@/routes/services.$category";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldCheck, Zap, Users, Star, MessageSquare, BadgeCheck, Briefcase, MapPin, Clock } from "lucide-react";
import { categories, stats } from "@/lib/mock-data";
import { useAuth, dashboardPathFor } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

interface AppRouteConfig {
  path: string;
  element: ReactElement;
}

function buildServicesUrl({
  q,
  category,
  minRating = 0,
  minPrice = 0,
  maxPrice = 0,
  sort = "newest",
}: {
  q: string;
  category: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
}) {
  const params = new URLSearchParams({
    q,
    category,
    minRating: String(minRating),
    minPrice: String(minPrice),
    maxPrice: String(maxPrice),
    sort,
  });
  return `/services?${params.toString()}`;
}

export const appRoutes: AppRouteConfig[] = [
  { path: "/", element: <Index /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/services", element: <MarketplacePage /> },
  { path: "/services/:category", element: <ServicesCategoryRedirect /> },
  { path: "/providers/:id", element: <ProviderPage /> },
  { path: "/profile", element: <ProfilePage /> },
  { path: "/messages", element: <MessagesPage /> },
  { path: "/notifications", element: <NotificationsPage /> },
  { path: "/onboarding", element: <OnboardingPage /> },
  { path: "/dashboard/client", element: <ClientDash /> },
  { path: "/dashboard/provider", element: <ProviderDash /> },
  { path: "/dashboard/admin", element: <AdminDash /> },
  { path: "/contact", element: <ContactPage /> },
  { path: "/cgu", element: <CguPage /> },
  { path: "/confidentialite", element: <PrivacyPage /> },
];

function Index() {
  const { role } = useAuth();
  const isProvider = role === "provider";
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {isProvider ? <ProviderHero /> : <HeroSearch />}

      {/* HOW IT WORKS */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-center font-display text-3xl font-bold md:text-4xl">Comment ça marche ?</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">Chercher un professionnel et contactez-le en un clic.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: Search, title: "1. Recherchez un professionnel", text: "Filtrez par métier, ville ou spécialité pour identifier les prestataires BTP disponibles au Cameroun." },
            { icon: BadgeCheck, title: "2. Comparez les profils vérifiés", text: "Consultez les badges, diplômes, réalisations et avis clients pour choisir en toute confiance." },
            { icon: MessageSquare, title: "3. Contactez-le en un clic", text: "Échangez directement via la messagerie sécurisée et démarrez votre projet sans délai." },
          ].map((s) => (
            <div key={s.title} className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-center font-display text-3xl font-bold md:text-4xl">Ils nous font confiance</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { name: "Sokhna M.", role: "Propriétaire", text: "J'ai trouvé un plombier en 30 minutes un dimanche soir. Bluffant !" },
            { name: "Cheikh D.", role: "Promoteur", text: "On gère désormais toutes nos sous-traitances BTP via WARAP." },
            { name: "Marie N.", role: "Architecte", text: "Plateforme claire, paiements sécurisés, vraie communauté pro." },
          ].map((t) => (
            <div key={t.name} className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="flex gap-0.5 text-primary">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="mt-4 text-sm leading-relaxed">"{t.text}"</p>
              <div className="mt-5 text-sm font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <div className="overflow-hidden rounded-3xl p-6 text-white sm:p-10 md:p-16" style={{ background: "var(--gradient-orange)" }}>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">Vous êtes un pro du BTP ?</h2>
              <p className="mt-3 max-w-xl text-sm text-white/90 sm:text-base">Rejoignez 3 000+ artisans et gagnez de nouveaux clients dès cette semaine.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
              {role ? (
                <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto"><Link to={dashboardPathFor(role)}>Mon espace</Link></Button>
              ) : (
                <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto"><Link to="/register">Devenir prestataire</Link></Button>
              )}
              <Button asChild size="lg" variant="outline" className="w-full border-white/40 bg-white/10 text-white hover:bg-white/20 sm:w-auto"><Link to={isProvider ? "/dashboard/provider/projects" : "/services"}>Découvrir</Link></Button>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-4 text-xs text-white/90 sm:gap-6 sm:text-sm">
            <span className="flex items-center gap-2"><Zap className="h-4 w-4 shrink-0" /> Inscription en 2 min</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0" /> 0% commission le 1er mois</span>
            <span className="flex items-center gap-2"><Users className="h-4 w-4 shrink-0" /> Support dédié</span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

const SERVICE_KEYWORDS: Record<string, string[]> = {
  plomberie: ["plombier", "fuite", "robinet", "chauffe-eau", "sanitaire", "evier", "wc"],
  electricite: ["electricien", "courant", "tableau", "prise", "domotique", "eclairage", "led"],
  maconnerie: ["macon", "mur", "dalle", "beton", "extension", "gros oeuvre"],
  peinture: ["peintre", "peinture", "enduit", "facade", "decoration"],
  menuiserie: ["menuisier", "bois", "porte", "fenetre", "dressing", "cuisine"],
  toiture: ["toit", "couvreur", "tuile", "etancheite", "charpente"],
  carrelage: ["carreleur", "carrelage", "faience", "terrasse", "sol"],
  architecture: ["architecte", "plan", "permis de construire", "3d", "etude"],
  renovation: ["renovation", "renover", "amenagement", "travaux"],
  climatisation: ["clim", "climatiseur", "froid", "ventilation", "split"],
};

function HeroSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const nq = normalize(q);
    if (!nq) return categories.slice(0, 8);
    return categories
      .map((c) => {
        const haystacks = [c.name, c.id, ...(SERVICE_KEYWORDS[c.id] ?? [])].map(normalize);
        const score = haystacks.some((h) => h.startsWith(nq))
          ? 0
          : haystacks.some((h) => h.includes(nq))
          ? 1
          : -1;
        return { c, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => a.score - b.score)
      .map((x) => x.c);
  }, [q]);

  useEffect(() => { setHighlight(0); }, [q]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (cat: { id: string } | null) => {
    setOpen(false);
    navigate(buildServicesUrl({ q: cat ? "" : q, category: cat?.id ?? "" }));
  };
  const searchFreeText = () => {
    setOpen(false);
    navigate(buildServicesUrl({ q, category: "" }));
  };

  return (
    <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,oklch(0.72_0.19_55/.25),transparent_60%)]" />
      <div className="container relative mx-auto px-4 py-20 md:py-28">
        <div className="max-w-3xl text-white">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> +3 240 pros vérifiés au Cameroun
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-tight md:text-6xl">
            Le BTP, <span className="text-primary">enfin simple.</span>
          </h1>
          <p className="mt-5 text-lg text-white/75 md:text-xl">
            Tapez un métier ou un besoin — nous vous proposons le bon prestataire.
          </p>

          <div ref={ref} className="relative mt-8">
            <div className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setOpen(true); }}
                  onFocus={() => setOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, results.length - 1)); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
                    else if (e.key === "Enter") { e.preventDefault(); if (results[highlight]) go(results[highlight]); else searchFreeText(); }
                    else if (e.key === "Escape") setOpen(false);
                  }}
                  placeholder="Quel service ? (ex: plombier, électricien, peinture…)"
                  className="h-12 border-0 pl-10 text-foreground focus-visible:ring-0"
                />
              </div>
              <Button size="lg" className="h-12 px-8" onClick={searchFreeText}>Rechercher</Button>
            </div>

            {open && (
              <div className="absolute left-0 right-0 z-20 mt-2 max-h-80 overflow-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-2xl">
                {results.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun service ne correspond à « {q} ».</div>
                ) : results.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onMouseDown={(e) => { e.preventDefault(); go(c); }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${i === highlight ? "bg-accent text-accent-foreground" : ""}`}
                  >
                    <span className="text-xl">{c.icon}</span>
                    <span className="flex-1">
                      <span className="block font-medium">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">Voir les prestataires disponibles</span>
                    </span>
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 text-white sm:gap-6 md:mt-16 md:grid-cols-4">
          {[
            { v: stats.providers, l: "Pros vérifiés" },
            { v: stats.jobs, l: "Missions réalisées" },
            { v: stats.cities, l: "Villes couvertes" },
            { v: stats.satisfaction, l: "Clients satisfaits" },
          ].map((s) => (
            <div key={s.l} className="min-w-0">
              <div className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">{s.v}</div>
              <div className="truncate text-xs text-white/60 sm:text-sm">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type OpenProject = {
  id: string; title: string; description: string; budget: number | null; city: string | null;
  created_at: string; expires_at: string | null; category: string | null;
  client_id: string; client_name: string; client_avatar: string | null;
  application_count: number; max_applications: number; my_rank: number | null; has_applied: boolean;
};

function ProviderHero() {
  const navigate = useNavigate();
  const [list, setList] = useState<OpenProject[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<"expiring" | "price_desc" | "price_asc" | "recent">("expiring");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("get_open_projects").then(({ data }) => {
      setList((data ?? []) as OpenProject[]);
      setLoading(false);
    });
  }, []);

  const results = useMemo(() => {
    const nq = normalize(q);
    let arr = list.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!nq) return true;
      const hay = normalize([p.title, p.description ?? "", p.city ?? "", p.category ?? ""].join(" "));
      return hay.includes(nq);
    });
    arr = [...arr].sort((a, b) => {
      if (sort === "price_desc") return (b.budget ?? 0) - (a.budget ?? 0);
      if (sort === "price_asc") return (a.budget ?? Infinity) - (b.budget ?? Infinity);
      if (sort === "recent") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      // expiring soonest first
      const ax = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
      const bx = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
      return ax - bx;
    });
    return arr.slice(0, 12);
  }, [list, q, category, sort]);

  return (
    <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,oklch(0.72_0.19_55/.25),transparent_60%)]" />
      <div className="container relative mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl text-white">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
            <Briefcase className="h-3 w-3 text-primary" /> Marketplace prestataires
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-tight md:text-6xl">
            Trouvez <span className="text-primary">des missions</span> près de chez vous.
          </h1>
          <p className="mt-5 text-lg text-white/75 md:text-xl">
            Parcourez les offres clients en temps réel et postulez en un clic.
          </p>
        </div>

        <div className="mt-8 grid gap-2 rounded-2xl bg-white p-3 shadow-2xl md:grid-cols-[1fr_180px_180px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une mission, un lieu…" className="h-11 border-0 pl-10 text-foreground focus-visible:ring-0" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="expiring">Expire bientôt</SelectItem>
              <SelectItem value="price_desc">Prix décroissant</SelectItem>
              <SelectItem value="price_asc">Prix croissant</SelectItem>
              <SelectItem value="recent">Plus récentes</SelectItem>
            </SelectContent>
          </Select>
          <Button size="lg" className="h-11" onClick={() => navigate("/dashboard/provider/projects")}>Voir tout</Button>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full rounded-xl bg-white/10 p-6 text-center text-white/80 backdrop-blur">Chargement des offres…</div>
          ) : results.length === 0 ? (
            <div className="col-span-full rounded-xl bg-white/10 p-6 text-center text-white/80 backdrop-blur">Aucune offre ne correspond à votre recherche.</div>
          ) : results.map((p) => {
            const days = p.expires_at ? Math.ceil((new Date(p.expires_at).getTime() - Date.now()) / 86400000) : null;
            const PALETTE = [
              { card: "bg-orange-50 border-orange-200 hover:bg-orange-100", badge: "border-transparent bg-orange-200 text-orange-900" },
              { card: "bg-blue-50 border-blue-200 hover:bg-blue-100", badge: "border-transparent bg-blue-200 text-blue-900" },
              { card: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100", badge: "border-transparent bg-emerald-200 text-emerald-900" },
              { card: "bg-violet-50 border-violet-200 hover:bg-violet-100", badge: "border-transparent bg-violet-200 text-violet-900" },
              { card: "bg-pink-50 border-pink-200 hover:bg-pink-100", badge: "border-transparent bg-pink-200 text-pink-900" },
              { card: "bg-amber-50 border-amber-200 hover:bg-amber-100", badge: "border-transparent bg-amber-200 text-amber-900" },
              { card: "bg-teal-50 border-teal-200 hover:bg-teal-100", badge: "border-transparent bg-teal-200 text-teal-900" },
              { card: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100", badge: "border-transparent bg-indigo-200 text-indigo-900" },
              { card: "bg-rose-50 border-rose-200 hover:bg-rose-100", badge: "border-transparent bg-rose-200 text-rose-900" },
              { card: "bg-cyan-50 border-cyan-200 hover:bg-cyan-100", badge: "border-transparent bg-cyan-200 text-cyan-900" },
              { card: "bg-lime-50 border-lime-200 hover:bg-lime-100", badge: "border-transparent bg-lime-200 text-lime-900" },
              { card: "bg-fuchsia-50 border-fuchsia-200 hover:bg-fuchsia-100", badge: "border-transparent bg-fuchsia-200 text-fuchsia-900" },
            ];
            const key = p.category ?? "";
            let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
            const tint = key ? PALETTE[h % PALETTE.length] : { card: "bg-white/95 border-white/10 hover:bg-white", badge: "" };
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/dashboard/provider/projects?apply=${encodeURIComponent(p.id)}`)}
                className={`group rounded-xl border p-4 text-left text-foreground shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl ${tint.card}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold line-clamp-1 group-hover:text-primary">{p.title}</h3>
                  {p.category && <Badge variant="outline" className={`shrink-0 text-xs capitalize ${tint.badge}`}>{p.category}</Badge>}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {p.budget != null && <span className="font-medium text-foreground">{p.budget} FCFA</span>}
                  {p.city && <span><MapPin className="inline h-3 w-3" /> {p.city}</span>}
                  {days != null && (
                    <span className={days <= 3 ? "text-destructive font-medium" : ""}>
                      <Clock className="inline h-3 w-3" /> {days > 0 ? `${days} j` : "Expire"}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

