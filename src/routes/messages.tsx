import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Msg = { id: string; sender_id: string; receiver_id: string; content: string; created_at: string; project_id?: string | null; status?: string | null };
type Contact = { id: string; full_name: string | null; name: string; avatar_url: string | null; is_admin: boolean };

export function MessagesPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get("to") ?? undefined;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<Contact | null>(null);
  const [thread, setThread] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) navigate("/login"); }, [loading, user, navigate]);

  // Load only authorized contacts: admin + selected provider/client relations
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_my_conversations");
      if (error) { toast.error(error.message); return; }
      const rows = (data ?? []) as Array<{ contact_id: string; full_name: string | null; name: string; avatar_url: string | null; is_admin: boolean }>;
      const list: Contact[] = rows.map((r) => ({ id: r.contact_id, full_name: r.full_name, name: r.name, avatar_url: r.avatar_url, is_admin: r.is_admin }));
      list.sort((a, b) => Number(b.is_admin) - Number(a.is_admin));

      // If a target contact was passed and isn't in the list yet, fetch its profile and prepend it
      if (targetId && !list.some((c) => c.id === targetId)) {
        const { data: p } = await supabase.rpc("get_provider_profile", { _id: targetId });
        const row = Array.isArray(p) ? p[0] : p;
        if (row) list.unshift({ id: row.id, full_name: row.full_name ?? null, name: row.name ?? "Prestataire", avatar_url: row.avatar_url ?? null, is_admin: false });
      }

      setContacts(list);
      const preferred = targetId ? list.find((c) => c.id === targetId) : null;
      if (preferred) setActive(preferred);
      else if (list.length && !active) setActive(list[0]);
    })();
  }, [user, targetId]);

  // Load thread + realtime
  useEffect(() => {
    if (!user || !active) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase.from("messages").select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${active.id}),and(sender_id.eq.${active.id},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      if (mounted) setThread((data ?? []) as Msg[]);
    })();
    const channel = supabase
      .channel(`messages:${user.id}:${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Msg;
        if ((m.sender_id === user.id && m.receiver_id === active.id) || (m.sender_id === active.id && m.receiver_id === user.id)) {
          setThread((t) => [...t, m]);
        }
      })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [user, active]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !active || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    const { data, error } = await supabase.rpc("send_message" as never, { _receiver_id: active.id, _content: content } as never);
    if (error) { toast.error((error as { message?: string }).message ?? "Erreur"); setDraft(content); return; }
    const cost = (data as { cost?: number } | null)?.cost ?? 0;
    if (cost > 0) toast.success(`Message envoyé (-${cost} jetons)`);
  };

  const dashboardPath = role === "provider" ? "/dashboard/provider" : role === "admin" ? "/dashboard/admin" : "/dashboard/client";

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto grid h-[calc(100vh-4rem)] grid-cols-1 gap-0 px-0 md:grid-cols-[320px_1fr]">
        <aside className="flex flex-col border-r border-border bg-card">
          <div className="border-b border-border p-4">
            <Link to={dashboardPath} className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Retour au tableau de bord
            </Link>
            <h2 className="font-display text-lg font-bold">Conversations</h2>
            <p className="mt-1 text-xs text-muted-foreground">Support WARAP, prestataires contactés et clients sélectionnés.</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 && <div className="p-4 text-sm text-muted-foreground">Aucune conversation autorisée. Sélectionnez un prestataire depuis votre tableau de bord pour ouvrir un fil.</div>}
            {contacts.map((c) => (
              <button key={c.id} onClick={() => setActive(c)} className={`flex w-full items-center gap-3 border-b border-border p-3 text-left transition-colors hover:bg-accent ${active?.id === c.id ? "bg-accent" : ""}`}>
                <img src={c.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.name}&backgroundColor=ea7c2c`} alt="" className="h-10 w-10 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{c.full_name ?? c.name}</div>
                  {c.is_admin && <div className="text-[10px] uppercase tracking-wide text-primary">Support WARAP</div>}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex flex-col bg-muted/20">
          {active ? (
            <>
              <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
                {active.is_admin || role !== "client" ? (
                  <>
                    <img src={active.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${active.name}&backgroundColor=ea7c2c`} alt="" className="h-10 w-10 rounded-full" />
                    <div className="font-semibold">{active.full_name ?? active.name}</div>
                  </>
                ) : (
                  <Link to={`/providers/${encodeURIComponent(active.id)}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <img src={active.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${active.name}&backgroundColor=ea7c2c`} alt="" className="h-10 w-10 rounded-full" />
                    <div className="font-semibold hover:underline">{active.full_name ?? active.name}</div>
                  </Link>
                )}
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto p-6">
                {thread.length === 0 && <div className="text-center text-sm text-muted-foreground">Aucun message. Dites bonjour 👋</div>}
                {thread.map((m) => {
                  const mine = m.sender_id === user.id;
                  const isJobMsg = !!m.project_id;
                  const closed = m.status === "closed";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-md rounded-2xl px-4 py-2 text-sm ${isJobMsg ? "border-2 border-primary/40 bg-primary/5 text-foreground" : mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card border border-border"}`}>
                        {isJobMsg && (
                          <div className="mb-1 flex items-center gap-2">
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">Mission</span>
                            {closed && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fermé</span>}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{m.content}</div>
                        <div className={`mt-1 text-[10px] ${isJobMsg ? "text-muted-foreground" : mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-card p-3">
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Écrire un message…" className="flex-1" />
                <Button size="icon" type="submit"><Send className="h-4 w-4" /></Button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-muted-foreground">Sélectionnez une conversation</div>
          )}
        </section>
      </div>
    </div>
  );
}
