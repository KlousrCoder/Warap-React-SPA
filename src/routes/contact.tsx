import { useState } from "react";
import { z } from "zod";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(10, "Message trop court").max(2000),
});

export function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setLoading(true);
    const { error } = await (supabase as any).from("contact_messages").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
    });
    setLoading(false);
    if (error) {
      toast.error("Impossible d'envoyer votre message. Réessayez.");
      return;
    }
    toast.success("Message envoyé ! Nous vous répondrons sous 24 h.");
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="relative overflow-hidden border-b border-border" style={{ background: "var(--gradient-hero)" }}>
        <div className="container mx-auto px-4 py-16 text-white md:py-20">
          <h1 className="font-display text-4xl font-bold md:text-5xl">Nous contacter</h1>
          <p className="mt-4 max-w-2xl text-white/80">Une question, un partenariat, un besoin spécifique ? Notre équipe vous répond sous 24 heures ouvrées.</p>
        </div>
      </section>

      <section className="container mx-auto grid gap-10 px-4 py-16 md:grid-cols-3">
        <aside className="space-y-6 md:col-span-1">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Mail className="h-5 w-5" /></span>
              <div>
                <div className="text-sm font-semibold">Email</div>
                <div className="text-sm text-muted-foreground">contact@warap.cm</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Phone className="h-5 w-5" /></span>
              <div>
                <div className="text-sm font-semibold">Téléphone</div>
                <div className="text-sm text-muted-foreground">+237 6 00 00 00 00</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></span>
              <div>
                <div className="text-sm font-semibold">Adresse</div>
                <div className="text-sm text-muted-foreground">Yaoundé, Cameroun</div>
              </div>
            </div>
          </div>
        </aside>

        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] md:col-span-2 md:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Votre nom" maxLength={100} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vous@exemple.com" maxLength={255} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Sujet</Label>
            <Input id="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Objet de votre message" maxLength={150} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea id="message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Décrivez votre demande…" rows={6} maxLength={2000} required />
          </div>
          <Button type="submit" size="lg" disabled={loading} className="w-full md:w-auto">
            <Send className="mr-2 h-4 w-4" />
            {loading ? "Envoi…" : "Envoyer le message"}
          </Button>
        </form>
      </section>

      <Footer />
    </div>
  );
}
