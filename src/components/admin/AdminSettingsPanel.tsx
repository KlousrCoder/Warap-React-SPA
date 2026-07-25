import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Save, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { getSystemStatus } from "@/lib/system-status.functions";

type SettingKind = "number" | "boolean" | "text";
type SettingDef = {
  key: string;
  label: string;
  description: string;
  kind: SettingKind;
  group: string;
  min?: number;
  max?: number;
  suffix?: string;
};

const DEFS: SettingDef[] = [
  // Économie / jetons
  { key: "signup_bonus_tokens", label: "Bonus d'inscription", description: "Jetons offerts à la création d'un compte.", kind: "number", group: "Économie & jetons", min: 0, max: 10000, suffix: "jetons" },
  { key: "token_price_fcfa", label: "Prix d'un jeton", description: "Valeur d'un jeton en FCFA (affiché lors des recharges).", kind: "number", group: "Économie & jetons", min: 1, max: 100000, suffix: "FCFA" },
  { key: "min_recharge_amount", label: "Recharge minimum", description: "Nombre minimum de jetons rechargeables en une opération.", kind: "number", group: "Économie & jetons", min: 1, max: 10000, suffix: "jetons" },
  { key: "max_recharge_amount", label: "Recharge maximum", description: "Nombre maximum de jetons rechargeables en une opération.", kind: "number", group: "Économie & jetons", min: 1, max: 100000, suffix: "jetons" },

  // Offres
  { key: "project_post_cost", label: "Coût de publication d'une offre", description: "Jetons débités au client à la publication.", kind: "number", group: "Offres", min: 1, max: 1000, suffix: "jetons" },
  { key: "project_duration_days", label: "Durée de vie d'une offre", description: "Nombre de jours avant expiration d'une offre.", kind: "number", group: "Offres", min: 1, max: 365, suffix: "jours" },
  { key: "max_applications_per_project", label: "Candidatures max. par offre", description: "Au-delà, l'offre devient « Complet ».", kind: "number", group: "Offres", min: 1, max: 100 },
  { key: "refund_window_hours", label: "Fenêtre de remboursement", description: "Durée pendant laquelle un client peut annuler sa sélection. Minimum 6h.", kind: "number", group: "Offres", min: 6, max: 168, suffix: "heures" },

  // Candidatures
  { key: "application_token_cost", label: "Coût d'une candidature", description: "Jetons débités au prestataire pour postuler.", kind: "number", group: "Candidatures", min: 1, max: 100, suffix: "jetons" },
  { key: "application_boost_cost", label: "Coût d'un boost", description: "Jetons débités par boost de candidature.", kind: "number", group: "Candidatures", min: 1, max: 100, suffix: "jetons" },

  // Contact / profil
  { key: "contact_token_cost", label: "Coût d'un contact prestataire", description: "Jetons débités au clic sur « Contacter ».", kind: "number", group: "Contact & profil", min: 1, max: 100, suffix: "jetons" },
  { key: "profile_publish_cost", label: "Coût de visibilité profil", description: "Jetons débités pour activer/prolonger la visibilité.", kind: "number", group: "Contact & profil", min: 1, max: 1000, suffix: "jetons" },
  { key: "profile_publish_duration_days", label: "Durée de visibilité", description: "Jours d'ajout à chaque activation.", kind: "number", group: "Contact & profil", min: 1, max: 365, suffix: "jours" },

  // Messagerie
  { key: "message_cost_enabled", label: "Facturer chaque message", description: "Active le débit de jetons à chaque message envoyé (les admins sont exemptés).", kind: "boolean", group: "Messagerie" },
  { key: "message_token_cost", label: "Coût par message envoyé", description: "Jetons débités à l'expéditeur pour chaque message (si activé).", kind: "number", group: "Messagerie", min: 0, max: 100, suffix: "jetons" },

  // Limites KYC / portfolio
  { key: "max_portfolio_items_per_provider", label: "Réalisations max. par prestataire", description: "Nombre max. d'éléments dans le portfolio.", kind: "number", group: "Limites", min: 1, max: 200 },
  { key: "max_diplomas_per_provider", label: "Diplômes max. par prestataire", description: "Nombre max. de diplômes soumis.", kind: "number", group: "Limites", min: 1, max: 50 },

  // Notifications
  { key: "whatsapp_notifications_enabled", label: "Notifications WhatsApp", description: "Active l'envoi WhatsApp via Twilio aux prestataires.", kind: "boolean", group: "Notifications" },
  { key: "notify_new_project_to_providers", label: "Notifier les nouvelles offres", description: "Envoie une notification interne aux prestataires de la catégorie.", kind: "boolean", group: "Notifications" },
  { key: "notification_toast_duration_ms", label: "Durée d'affichage des toasts (ms)", description: "Temps d'affichage des notifications popup côté prestataire.", kind: "number", group: "Notifications", min: 2000, max: 30000, suffix: "ms" },

  // Support / branding
  { key: "support_email", label: "Email de support", description: "Adresse affichée aux utilisateurs pour le support.", kind: "text", group: "Support" },
  { key: "support_phone", label: "Téléphone de support", description: "Numéro affiché aux utilisateurs (format international).", kind: "text", group: "Support" },
];

type Row = { key: string; value: unknown };

export function AdminSettingsPanel() {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getSystemStatus>> | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("key, value");
      const map: Record<string, string | boolean> = {};
      (data as Row[] | null)?.forEach((r) => {
        const def = DEFS.find((d) => d.key === r.key);
        if (!def) return;
        if (def.kind === "boolean") map[r.key] = r.value === true;
        else map[r.key] = String(r.value ?? "").replace(/^"|"$/g, "");
      });
      setValues(map);
      try { setStatus(await getSystemStatus()); } catch { /* non-admin fallback */ }
    })();
  }, []);

  const save = async (def: SettingDef) => {
    const raw = values[def.key];
    let toStore: unknown;
    if (def.kind === "number") {
      const n = Number(raw);
      if (!Number.isFinite(n)) return toast.error("Valeur numérique invalide");
      if (def.min != null && n < def.min) return toast.error(`Minimum ${def.min}`);
      if (def.max != null && n > def.max) return toast.error(`Maximum ${def.max}`);
      toStore = n;
    } else if (def.kind === "boolean") {
      toStore = !!raw;
    } else {
      toStore = String(raw ?? "");
    }
    setSaving((s) => ({ ...s, [def.key]: true }));
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: def.key, value: toStore as never, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSaving((s) => ({ ...s, [def.key]: false }));
    if (error) return toast.error(error.message);
    toast.success(`« ${def.label} » mis à jour`);
  };

  const groups = Array.from(new Set(DEFS.map((d) => d.group)));

  return (
    <div className="space-y-6">
      {/* Statut intégrations */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Clés API & intégrations</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Les clés secrètes sont stockées côté serveur et ne sont jamais affichées. Ce panneau montre uniquement si chaque clé est configurée.
        </p>
        {status ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <StatusRow label="Twilio · Account SID" ok={status.twilio.accountSid} />
            <StatusRow label="Twilio · Auth Token" ok={status.twilio.authToken} />
            <StatusRow label="Twilio · WhatsApp From" ok={status.twilio.whatsappFrom} />
            <StatusRow label="Twilio · Template SID" ok={status.twilio.templateSid} />
            <StatusRow label="Twilio · Content SID" ok={status.twilio.contentSid} />
            <StatusRow label="Lovable API Key" ok={status.lovable.apiKey} />
            <StatusRow label="Supabase · URL" ok={status.supabase.url} />
            <StatusRow label="Supabase · Service Role" ok={status.supabase.serviceRoleKey} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        )}
      </div>

      {/* Réglages dynamiques */}
      {groups.map((g) => (
        <div key={g} className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold">{g}</h3>
          <div className="grid gap-5 md:grid-cols-2">
            {DEFS.filter((d) => d.group === g).map((def) => (
              <div key={def.key} className="rounded-lg border border-border bg-background p-4">
                <Label className="font-medium">{def.label}</Label>
                <p className="mt-1 text-xs text-muted-foreground">{def.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  {def.kind === "boolean" ? (
                    <Switch
                      checked={!!values[def.key]}
                      onCheckedChange={(v) => setValues((s) => ({ ...s, [def.key]: v }))}
                    />
                  ) : (
                    <Input
                      type={def.kind === "number" ? "number" : "text"}
                      min={def.min}
                      max={def.max}
                      value={String(values[def.key] ?? "")}
                      onChange={(e) => setValues((s) => ({ ...s, [def.key]: e.target.value }))}
                    />
                  )}
                  {def.suffix && <span className="text-xs text-muted-foreground">{def.suffix}</span>}
                  <Button size="sm" onClick={() => save(def)} disabled={!!saving[def.key]}>
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    {saving[def.key] ? "…" : "Enregistrer"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
      <span>{label}</span>
      {ok ? (
        <Badge className="bg-green-600 text-white hover:bg-green-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Configurée</Badge>
      ) : (
        <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Manquante</Badge>
      )}
    </div>
  );
}
