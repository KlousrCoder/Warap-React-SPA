import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { categories } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Search, MapPin, Star, Wrench, MessageCircle, SlidersHorizontal, X, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

type SearchState = {
  q: string;
  category: string;
  minRating: number;
  minPrice: number;
  maxPrice: number;
  sort: "newest" | "oldest" | "price_asc" | "price_desc" | "rating";
};

const defaultSearchState: SearchState = {
  q: "",
  category: "",
  minRating: 0,
  minPrice: 0,
  maxPrice: 0,
  sort: "newest",
};

function readSearchState(searchParams: URLSearchParams): SearchState {
  return {
    q: searchParams.get("q") ?? "",
    category: searchParams.get("category") ?? "",
    minRating: Number(searchParams.get("minRating") ?? 0),
    minPrice: Number(searchParams.get("minPrice") ?? 0),
    maxPrice: Number(searchParams.get("maxPrice") ?? 0),
    sort: (searchParams.get("sort") as SearchState["sort"]) ?? "newest",
  };
}

function writeSearchState(searchState: SearchState) {
  const params = new URLSearchParams();
  if (searchState.q) params.set("q", searchState.q);
  if (searchState.category) params.set("category", searchState.category);
  if (searchState.minRating > 0) params.set("minRating", String(searchState.minRating));
  if (searchState.minPrice > 0) params.set("minPrice", String(searchState.minPrice));
  if (searchState.maxPrice > 0) params.set("maxPrice", String(searchState.maxPrice));
  if (searchState.sort !== "newest") params.set("sort", searchState.sort);
  return `?${params.toString()}`;
}

type Row = {
  id: string; title: string; description: string | null; price: number | null; category: string | null; created_at: string;
  provider_id: string; provider_name: string; provider_avatar: string | null; provider_city: string | null;
  provider_rating: number; provider_reviews_count: number;
};

function normalize(s: string) { return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim(); }

export function MarketplacePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = readSearchState(searchParams);
  const { user, role } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactCost, setContactCost] = useState(3);
  const [contactTarget, setContactTarget] = useState<{ id: string; name: string } | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [q, setQ] = useState(search.q);
  useEffect(() => { setQ(search.q); }, [search.q]);
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (q !== search.q) {
        const next = { ...search, q };
        setSearchParams(new URLSearchParams(writeSearchState(next).slice(1)), { replace: true });
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, search, setSearchParams]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_marketplace_services" as never, {
        _q: search.q || null,
        _category: search.category || null,
        _min_rating: search.minRating || null,
        _min_price: search.minPrice || null,
        _max_price: search.maxPrice || null,
        _sort: search.sort,
      } as never);
      if (error) console.error(error);
      setItems(((data as unknown) as Row[]) ?? []);
      setLoading(false);
    })();
    supabase.from("app_settings").select("value").eq("key", "contact_token_cost").maybeSingle()
      .then(({ data }) => { if (data?.value != null) setContactCost(Number(data.value)); });
  }, [search.q, search.category, search.minRating, search.minPrice, search.maxPrice, search.sort]);

  // Extra client-side accent-insensitive filter (in case ILIKE missed accents)
  const filtered = useMemo(() => {
    if (!search.q) return items;
    const nq = normalize(search.q);
    return items.filter((s) =>
      normalize(s.title).includes(nq) ||
      normalize(s.description ?? "").includes(nq) ||
      normalize(s.provider_name).includes(nq)
    );
  }, [items, search.q]);

  const sendContact = async () => {
    if (!contactTarget) return;
    if (!user) { toast.error("Connectez-vous pour contacter un prestataire"); return; }
    if (role !== "client") { toast.error("Seuls les clients peuvent contacter les prestataires"); return; }
    if (message.trim().length < 3) { toast.error("Message trop court"); return; }
    setSending(true);
    const { data, error } = await supabase.rpc("contact_provider", { _provider_id: contactTarget.id, _message: message });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Message envoyé (-${(data as { cost?: number } | null)?.cost ?? contactCost} jetons)`);
    const targetId = contactTarget.id;
    setContactTarget(null); setMessage("");
    navigate(`/messages?to=${encodeURIComponent(targetId)}`);
  };

  const updateSearch = (patch: Partial<SearchState>) => {
    const next = { ...search, ...patch };
    setSearchParams(new URLSearchParams(writeSearchState(next).slice(1)), { replace: true });
  };
  const resetFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hasFilters = search.category || search.minRating > 0 || search.minPrice > 0 || search.maxPrice > 0 || search.sort !== "newest";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="border-b border-border bg-muted/40">
        <div className="container mx-auto px-4 py-10">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Marketplace de services</h1>
          <p className="mt-2 text-muted-foreground">Découvrez les services proposés par nos prestataires vérifiés.</p>
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher un service, un prestataire…"
                className="h-11 pl-9"
              />
              {q && (
                <button onClick={() => { setQ(""); updateSearch({ q: "" }); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button variant="outline" onClick={() => setShowFilters((v) => !v)} className="h-11">
              <SlidersHorizontal className="mr-2 h-4 w-4" /> Filtres {hasFilters && <span className="ml-2 rounded-full bg-primary px-2 text-xs text-primary-foreground">•</span>}
            </Button>
            <Select value={search.sort} onValueChange={(v) => updateSearch({ sort: v as typeof search.sort })}>
              <SelectTrigger className="h-11 md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Plus récent</SelectItem>
                <SelectItem value="oldest">Plus ancien</SelectItem>
                <SelectItem value="price_asc">Prix croissant</SelectItem>
                <SelectItem value="price_desc">Prix décroissant</SelectItem>
                <SelectItem value="rating">Mieux notés</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showFilters && (
            <div className="mt-4 grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
              <div>
                <Label className="text-xs">Catégorie</Label>
                <Select value={search.category || "_all"} onValueChange={(v) => updateSearch({ category: v === "_all" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Toutes</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Note minimale</Label>
                <Select value={String(search.minRating)} onValueChange={(v) => updateSearch({ minRating: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Toutes</SelectItem>
                    <SelectItem value="3">3★ et +</SelectItem>
                    <SelectItem value="4">4★ et +</SelectItem>
                    <SelectItem value="5">5★</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Prix min (FCFA)</Label>
                <Input type="number" min={0} value={search.minPrice || ""} onChange={(e) => updateSearch({ minPrice: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="text-xs">Prix max (FCFA)</Label>
                <Input type="number" min={0} value={search.maxPrice || ""} onChange={(e) => updateSearch({ maxPrice: Number(e.target.value) || 0 })} />
              </div>
              {hasFilters && (
                <div className="md:col-span-4">
                  <Button variant="ghost" size="sm" onClick={resetFilters}><X className="mr-1.5 h-3.5 w-3.5" /> Réinitialiser</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="mb-4 text-sm text-muted-foreground">
          {loading ? "Chargement…" : `${filtered.length} service${filtered.length > 1 ? "s" : ""} trouvé${filtered.length > 1 ? "s" : ""}`}
        </div>
        {!loading && filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Wrench className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">Aucun service ne correspond à votre recherche</h3>
            <p className="mt-2 text-sm text-muted-foreground">Essayez d'élargir vos filtres. Seuls les prestataires vérifiés (KYC) avec visibilité active apparaissent ici.</p>
            {hasFilters && <Button className="mt-4" variant="outline" onClick={resetFilters}>Réinitialiser les filtres</Button>}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => {
              const cat = categories.find((c) => c.id === s.category);
              return (
                <article key={s.id} className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold leading-tight">{s.title}</h3>
                    {cat && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{cat.icon} {cat.name}</span>}
                  </div>
                  {s.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}

                  <Link to={`/providers/${encodeURIComponent(s.provider_id)}`} className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2.5 hover:bg-muted/60">
                    {s.provider_avatar
                      ? <img src={s.provider_avatar} alt={s.provider_name} className="h-9 w-9 rounded-lg object-cover" />
                      : <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{s.provider_name[0]}</span>}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 truncate text-sm font-medium">{s.provider_name}<BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" /></div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-primary text-primary" />{Number(s.provider_rating).toFixed(1)} ({s.provider_reviews_count})</span>
                        {s.provider_city && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{s.provider_city}</span>}
                      </div>
                    </div>
                  </Link>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="font-display text-lg font-bold text-primary">
                      {s.price ? `${Number(s.price).toLocaleString("fr-FR")} F` : "Sur devis"}
                    </div>
                    <div className="flex gap-1.5">
                      <Button asChild size="sm" variant="outline"><Link to={`/providers/${encodeURIComponent(s.provider_id)}`}>Voir</Link></Button>
                      <Button size="sm" className="bg-orange-600 text-white hover:bg-orange-700" onClick={() => setContactTarget({ id: s.provider_id, name: s.provider_name })} disabled={!!user && user.id === s.provider_id}>
                        <MessageCircle className="mr-1 h-3.5 w-3.5" /> Contacter
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={!!contactTarget} onOpenChange={(o) => { if (!o) { setContactTarget(null); setMessage(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Contacter {contactTarget?.name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Premier message : <span className="font-semibold text-foreground">{contactCost} jetons</span>. Échanges illimités ensuite dans la messagerie.</p>
          <Textarea rows={5} placeholder="Présentez votre besoin (lieu, délai, budget…)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setContactTarget(null); setMessage(""); }}>Annuler</Button>
            <Button className="bg-orange-600 text-white hover:bg-orange-700" onClick={sendContact} disabled={sending}>{sending ? "Envoi…" : `Envoyer (-${contactCost} jetons)`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
