import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Star, MapPin, BadgeCheck, Briefcase, MessageSquare, MessageCircle, Wrench, Info } from "lucide-react";
import { ReviewsSection } from "@/components/ReviewsSection";
import { ProviderBadges, type DiplomaBadge } from "@/components/ProviderBadges";
import { categories } from "@/lib/mock-data";
import { toast } from "sonner";

type Profile = { id: string; name: string; city: string | null; bio: string | null; avatar_url: string | null; cover_url: string | null; provider_category: string | null };
type Service = { id: string; title: string; description: string | null; price: number | null; category: string | null };
type Portfolio = { id: string; title: string; description: string | null; image_url: string | null; category: string | null; completed_at: string | null; location: string | null };

export function ProviderPage() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [diplomas, setDiplomas] = useState<DiplomaBadge[]>([]);
  const [kycVerified, setKycVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [contactCost, setContactCost] = useState(3);
  const [contactOpen, setContactOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: visible } = await supabase.rpc("provider_is_visible" as never, { _id: id } as never);
      // Allow owner / admin to always see; otherwise require visibility
      const isOwner = !!user && user.id === id;
      const isAdmin = role === "admin";
      if (!visible && !isOwner && !isAdmin) { setNotFound(true); setLoading(false); return; }
      const { data: profRows } = await supabase.rpc("get_provider_profile" as never, { _id: id } as never);
      const prof = Array.isArray(profRows) ? profRows[0] : profRows;
      if (!prof) { setNotFound(true); setLoading(false); return; }
      const [{ data: svc }, { data: pf }, { data: setting }, { data: dip }] = await Promise.all([
        supabase.from("services").select("id,title,description,price,category").eq("user_id", id),
        supabase.from("portfolio").select("id,title,description,image_url,category,completed_at,location").eq("user_id", id).order("completed_at", { ascending: false, nullsFirst: false }),
        supabase.from("app_settings").select("value").eq("key", "contact_token_cost").maybeSingle(),
        (supabase.from("diplomas" as never) as any).select("id,title,badge_color,status").eq("user_id", id).eq("status", "approved"),
      ]);
      setProfile(prof as Profile);
      setKycVerified((prof as { kyc_status?: string }).kyc_status === "valid");
      setDiplomas(((dip ?? []) as DiplomaBadge[]));
      setServices(svc ?? []);
      setPortfolio(pf ?? []);
      if (setting?.value != null) setContactCost(Number(setting.value));
      if (user) {
        const { data: sel } = await supabase.from("projects").select("id").eq("client_id", user.id).eq("selected_provider_id", id).limit(1);
        setIsSelected((sel ?? []).length > 0);
      }
      setLoading(false);
    })();
  }, [id, user, role]);

  const sendContact = async () => {
    if (!profile) return;
    if (!user) { toast.error("Connectez-vous pour contacter un prestataire"); return; }
    if (role !== "client") { toast.error("Seuls les clients peuvent contacter les prestataires"); return; }
    if (message.trim().length < 3) { toast.error("Message trop court"); return; }
    setSending(true);
    const { data, error } = await supabase.rpc("contact_provider", { _provider_id: profile.id, _message: message });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Message envoyé (-${(data as any)?.cost ?? contactCost} jetons)`);
    setContactOpen(false); setMessage("");
    navigate(`/messages?to=${encodeURIComponent(profile.id)}`);
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto px-4 py-20 text-muted-foreground">Chargement…</div></div>;
  if (notFound || !profile) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Prestataire introuvable</h1>
        <Link to="/services" className="mt-4 inline-block text-primary hover:underline">← Retour aux services</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="relative h-48 w-full overflow-hidden md:h-64">
        <img src={profile.cover_url || "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1600&q=80"} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/60 to-transparent" />
      </div>
      <section className="border-b border-border bg-secondary text-secondary-foreground">
        <div className="container mx-auto flex flex-col gap-6 px-4 py-6 md:flex-row md:items-center">
          {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} className="-mt-16 h-28 w-28 rounded-2xl border-4 border-secondary object-cover shadow-xl" /> :
            <span className="-mt-16 grid h-28 w-28 place-items-center rounded-2xl border-4 border-secondary bg-primary text-4xl font-bold text-primary-foreground shadow-xl">{profile.name[0]}</span>}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-bold">{profile.name}</h1>
              {kycVerified && <BadgeCheck className="h-6 w-6 text-primary" />}
            </div>
            {(() => {
              const cat = categories.find((c) => c.id === profile.provider_category);
              return cat ? (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground shadow-sm">
                  <span>{cat.icon}</span><span>{cat.name}</span>
                </div>
              ) : null;
            })()}
            {(kycVerified || diplomas.length > 0 || portfolio.length > 0) && (
              <div className="mt-2">
                <ProviderBadges verified={kycVerified} diplomas={diplomas} worksCount={portfolio.length} />
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-primary text-primary" /><b>4.8</b> (avis)</span>
              {profile.city && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {profile.city}</span>}
              <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" /> {services.length} services</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isSelected ? (
              <Link to="/messages"><Button><MessageSquare className="mr-2 h-4 w-4" /> Ouvrir la conversation</Button></Link>
            ) : (
              <Button onClick={() => setContactOpen(true)} disabled={!!user && user.id === profile.id}>
                <MessageCircle className="mr-2 h-4 w-4" /> Contacter ({contactCost} jetons)
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto grid gap-10 px-4 py-12 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <div>
            <h2 className="font-display text-2xl font-bold">À propos</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{profile.bio ?? "Ce prestataire n'a pas encore renseigné sa biographie."}</p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold">Portfolio — Réalisations</h2>
            {portfolio.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Aucune réalisation publiée pour le moment.</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {portfolio.map((w) => (
                  <div key={w.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
                    {w.image_url && <img src={w.image_url} alt={w.title} className="aspect-[4/3] w-full object-cover" />}
                    <div className="p-3">
                      <div className="text-sm font-semibold">{w.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                        {w.category && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{w.category}</span>}
                        {w.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{w.location}</span>}
                        {w.completed_at && <span>· {new Date(w.completed_at).toLocaleDateString("fr-FR")}</span>}
                      </div>
                      {w.description && <div className="mt-1.5 text-xs text-muted-foreground">{w.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ReviewsSection providerId={profile.id} />
        </div>


        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-semibold">Services proposés</h3>
            {services.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Aucun service publié.</p>
            ) : (
              <ul className="mt-3 space-y-3 text-sm">
                {services.map((s) => (
                  <li key={s.id} className="border-b border-border pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium"><Wrench className="h-3.5 w-3.5 text-primary" />{s.title}</span>
                      <span className="font-semibold text-primary">{s.price ? `${Number(s.price).toLocaleString("fr-FR")} F` : "Devis"}</span>
                    </div>
                    {s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
                  </li>
                ))}
              </ul>
            )}
            <Button
              className="mt-4 w-full bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => setContactOpen(true)}
              disabled={!!user && user.id === profile.id}
            >
              <MessageCircle className="mr-1.5 h-4 w-4" /> Contacter ({contactCost} jetons)
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground flex gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 text-primary" />
              Le premier message coûte {contactCost} jetons. La conversation s'ouvre ensuite gratuitement dans la messagerie des deux côtés.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold">Garanties WARAP</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li>✓ Pro vérifié et assuré</li>
              <li>✓ Paiement sécurisé</li>
              <li>✓ Satisfait ou remboursé</li>
            </ul>
          </div>
        </aside>
      </section>

      <Dialog open={contactOpen} onOpenChange={(o) => { setContactOpen(o); if (!o) setMessage(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Contacter {profile.name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cet envoi coûte <span className="font-semibold text-foreground">{contactCost} jetons</span>. La conversation s'ouvrira ensuite gratuitement dans votre messagerie et celle du prestataire.</p>
          <Textarea rows={5} placeholder="Présentez votre besoin (lieu, délai, budget…)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setContactOpen(false); setMessage(""); }}>Annuler</Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={sendContact} disabled={sending}>{sending ? "Envoi…" : `Envoyer (-${contactCost} jetons)`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
