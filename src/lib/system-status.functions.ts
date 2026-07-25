// Renvoie l'état des intégrations côté SPA.
// Les secrets sont toujours traités comme des booléens et ne sont jamais exposés.
import { supabase } from "@/integrations/supabase/client";

export async function getSystemStatus() {
  try {
    const { data } = await supabase.from("app_settings").select("key, value");
    const settings = new Map<string, unknown>((data ?? []).map((row: { key: string; value: unknown }) => [row.key, row.value]));

    const hasSetting = (key: string) => {
      const value = settings.get(key);
      if (typeof value === "string") return value.trim().length > 0;
      if (typeof value === "number") return value > 0;
      return Boolean(value);
    };

    return {
      twilio: {
        accountSid: hasSetting("twilio_account_sid") || Boolean(import.meta.env.VITE_TWILIO_ACCOUNT_SID),
        authToken: hasSetting("twilio_auth_token") || Boolean(import.meta.env.VITE_TWILIO_AUTH_TOKEN),
        whatsappFrom: hasSetting("twilio_whatsapp_from") || Boolean(import.meta.env.VITE_TWILIO_WHATSAPP_FROM),
        templateSid: hasSetting("twilio_whatsapp_template_sid") || Boolean(import.meta.env.VITE_TWILIO_WHATSAPP_TEMPLATE_SID),
        contentSid: hasSetting("twilio_content_sid") || Boolean(import.meta.env.VITE_TWILIO_CONTENT_SID),
      },
      lovable: { apiKey: hasSetting("lovable_api_key") || Boolean(import.meta.env.VITE_LOVABLE_API_KEY) },
      supabase: {
        url: Boolean(import.meta.env.VITE_SUPABASE_URL) || Boolean(import.meta.env.SUPABASE_URL),
        serviceRoleKey: Boolean(import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) || Boolean(import.meta.env.SUPABASE_SERVICE_ROLE_KEY),
      },
    };
  } catch {
    return {
      twilio: {
        accountSid: false,
        authToken: false,
        whatsappFrom: false,
        templateSid: false,
        contentSid: false,
      },
      lovable: { apiKey: false },
      supabase: {
        url: false,
        serviceRoleKey: false,
      },
    };
  }
}
