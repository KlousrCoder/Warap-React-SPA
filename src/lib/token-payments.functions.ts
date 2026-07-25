import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const createSchema = z.object({
  tokenAmount: z.number().int().min(1).max(100000),
});

const verifySchema = z.object({
  paymentId: z.string().uuid(),
});

async function getTokenPrice(supabaseClient: any): Promise<number> {
  const { data } = await supabaseClient
    .from("app_settings")
    .select("value")
    .eq("key", "token_price_xaf")
    .maybeSingle();
  const raw = data?.value as unknown;
  const price = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(price) || price <= 0) return 50;
  return Math.floor(price);
}

export async function getTokenPriceFn() {
  const price = await getTokenPrice(supabase);
  return { tokenPriceXaf: price };
}

export async function createTokenPayment({ data, userId, supabaseClient = supabase }: { data: unknown; userId: string; supabaseClient?: any }) {
  const parsed = createSchema.parse(data);
  const price = await getTokenPrice(supabaseClient);
  const tokenAmount = parsed.tokenAmount;
  const amountXaf = tokenAmount * price;

  if (amountXaf < 100) {
    throw new Error(`Le montant minimum est de 100 XAF (soit ${Math.ceil(100 / price)} jetons).`);
  }

  const externalId = `warap_${userId.slice(0, 8)}_${Date.now()}`;
  const { data: payment, error: insErr } = await supabaseClient
    .from("token_payments")
    .insert({
      user_id: userId,
      token_amount: tokenAmount,
      amount_xaf: amountXaf,
      token_price_xaf: price,
      status: "PENDING",
      external_id: externalId,
    })
    .select("id")
    .single();

  if (insErr || !payment) throw new Error(insErr?.message || "Impossible de créer le paiement");

  const paymentLink = typeof window !== "undefined" ? `${window.location.origin}/profile?payment=${payment.id}` : `/profile?payment=${payment.id}`;
  await supabaseClient
    .from("token_payments")
    .update({
      fapshi_trans_id: `local-${payment.id}`,
      fapshi_payment_link: paymentLink,
    })
    .eq("id", payment.id);

  return {
    paymentId: payment.id as string,
    paymentLink,
    transId: `local-${payment.id}`,
    amountXaf,
    tokenAmount,
    tokenPriceXaf: price,
  };
}

export async function verifyTokenPayment({ data, userId, supabaseClient = supabase }: { data: unknown; userId: string; supabaseClient?: any }) {
  const parsed = verifySchema.parse(data);
  const { data: payment, error } = await supabaseClient
    .from("token_payments")
    .select("id, user_id, token_amount, amount_xaf, status, fapshi_trans_id")
    .eq("id", parsed.paymentId)
    .maybeSingle();

  if (error || !payment) throw new Error("Paiement introuvable");
  if (payment.user_id !== userId) throw new Error("Non autorisé");
  if (payment.status === "SUCCESSFUL") {
    return { status: "SUCCESSFUL" as const, tokenAmount: payment.token_amount };
  }

  await supabaseClient.from("token_payments").update({ status: "SUCCESSFUL" }).eq("id", payment.id);
  await supabaseClient.rpc("credit_tokens_from_payment", {
    _payment_id: payment.id,
    _fapshi_trans_id: payment.fapshi_trans_id ?? payment.id,
    _payload: { status: "SUCCESSFUL" },
  });

  return { status: "SUCCESSFUL" as const, tokenAmount: payment.token_amount };
}
