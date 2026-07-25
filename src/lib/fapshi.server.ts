// Server-only Fapshi helper. Never import from client code.
// Docs: https://documenter.getpostman.com/view/17178321/2s9YsGqzju

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  const candidates = [".env.local", ".env"];

  for (const relativePath of candidates) {
    const absolutePath = resolve(process.cwd(), relativePath);
    if (!existsSync(absolutePath)) {
      continue;
    }

    const content = readFileSync(absolutePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex < 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

loadEnvFile();

export type FapshiInitResponse = {
  message?: string;
  link?: string;
  transId?: string;
  statusCode?: number;
};

export type FapshiStatus = "CREATED" | "PENDING" | "SUCCESSFUL" | "FAILED" | "EXPIRED";

export type FapshiStatusResponse = {
  transId?: string;
  status?: FapshiStatus;
  medium?: string;
  serviceName?: string;
  amount?: number;
  revenue?: number;
  payerName?: string;
  email?: string;
  redirectUrl?: string;
  externalId?: string;
  userId?: string;
  webhook?: string;
  financialTransId?: string;
  dateInitiated?: string;
  dateConfirmed?: string;
  message?: string;
};

function getEnvVar(name: string): string | undefined {
  const fromProcess = process.env?.[name];
  if (typeof fromProcess === "string" && fromProcess.trim()) {
    return fromProcess.trim();
  }

  const metaEnv = (import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env;
  const fromMeta = metaEnv?.[name];
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim();
  }

  return undefined;
}

function getEnv() {
  const apiuser = getEnvVar("FAPSHI_API_USER");
  const apikey = getEnvVar("FAPSHI_API_KEY");
  if (!apiuser || !apikey) {
    throw new Error("Fapshi non configuré (FAPSHI_API_USER / FAPSHI_API_KEY manquants dans .env)");
  }
  return { apiuser, apikey };
}

async function getBaseUrl(): Promise<string> {
  const fromEnv = getEnvVar("FAPSHI_BASE_URL");
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "fapshi_base_url")
    .maybeSingle();
  const raw = (data?.value as unknown) ?? null;
  const url = typeof raw === "string" ? raw : "https://sandbox.fapshi.com";
  return url.replace(/\/+$/, "");
}

export async function fapshiInitiatePay(input: {
  amount: number;
  externalId: string;
  userId: string;
  email?: string;
  message?: string;
  redirectUrl?: string;
}): Promise<FapshiInitResponse> {
  const { apiuser, apikey } = getEnv();
  const base = await getBaseUrl();
  const res = await fetch(`${base}/initiate-pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apiuser,
      apikey,
    },
    body: JSON.stringify({
      amount: input.amount,
      email: input.email,
      userId: input.userId,
      externalId: input.externalId,
      message: input.message ?? "Achat de jetons WARAP",
      redirectUrl: input.redirectUrl,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as FapshiInitResponse;
  if (!res.ok || !json.link || !json.transId) {
    throw new Error(json?.message || `Fapshi init a échoué (${res.status})`);
  }
  return json;
}

export async function fapshiPaymentStatus(transId: string): Promise<FapshiStatusResponse> {
  const { apiuser, apikey } = getEnv();
  const base = await getBaseUrl();
  const res = await fetch(`${base}/payment-status/${encodeURIComponent(transId)}`, {
    method: "GET",
    headers: { apiuser, apikey },
  });
  const json = (await res.json().catch(() => ({}))) as FapshiStatusResponse;
  if (!res.ok) {
    throw new Error(json?.message || `Fapshi status a échoué (${res.status})`);
  }
  return json;
}
