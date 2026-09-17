import crypto from "node:crypto";

export type PetAlyzePaidPlan = "plus" | "pro";
export type BillingInterval = "monthly" | "annual";

const PRICES: Record<PetAlyzePaidPlan, Record<BillingInterval, number>> = {
  plus: { monthly: 7.99, annual: 79.99 },
  pro: { monthly: 14.99, annual: 149.99 },
};

export function getTranzzoConfig() {
  return {
    apiUrl: process.env.TRANZZO_API_URL || "https://cpay.tranzzo.com/api/v1/payment",
    posId: process.env.TRANZZO_POS_ID || "",
    apiKey: process.env.TRANZZO_API_KEY || "",
    apiSecret: process.env.TRANZZO_API_SECRET || "",
    endpointsKey: process.env.TRANZZO_ENDPOINTS_KEY || "",
    siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
    checkoutEnabled: process.env.TRANZZO_CHECKOUT_ENABLED === "true",
  };
}

export function assertTranzzoCredentials() {
  const config = getTranzzoConfig();
  if (!config.posId || !config.apiKey || !config.apiSecret || !config.endpointsKey) {
    throw new Error("Tranzzo server credentials are not configured.");
  }
  return config;
}

export function signTranzzoRequest(rawBody: string, apiSecret: string) {
  return crypto.createHmac("sha256", apiSecret).update(rawBody).digest("hex");
}

export function verifyTranzzoWebhook(data: string, signature: string, apiSecret: string) {
  const digest = crypto
    .createHash("sha1")
    .update(`${apiSecret}${data}${apiSecret}`, "utf8")
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const expected = Buffer.from(digest, "utf8");
  const received = Buffer.from(signature || "", "utf8");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export function decodeTranzzoWebhookData(data: string) {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return JSON.parse(Buffer.from(normalized + padding, "base64").toString("utf8"));
}

function addBillingInterval(date: Date, billing: BillingInterval) {
  const next = new Date(date);
  if (billing === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next;
}

function yyyyMmDd(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildSubscriptionCheckout(input: {
  userId: string;
  email?: string | null;
  plan: PetAlyzePaidPlan;
  billing: BillingInterval;
}) {
  const config = assertTranzzoCredentials();
  const amount = PRICES[input.plan][input.billing];
  const now = new Date();
  const nextCharge = addBillingInterval(now, input.billing);
  const orderId = `petalyze_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const planName = input.plan === "plus" ? "Plus" : "Pro";

  return {
    orderId,
    body: {
      pos_id: config.posId,
      mode: "hosted",
      method: "purchase",
      amount,
      currency: "USD",
      description: `PetAlyze ${planName} ${input.billing} subscription`,
      order_id: orderId,
      order_3ds_bypass: "supported",
      customer_id: input.userId,
      ...(input.email ? { customer_email: input.email } : {}),
      server_url: `${config.siteUrl}/api/payments/tranzzo/webhook`,
      result_url: `${config.siteUrl}/payment/result?provider=tranzzo&order_id=${encodeURIComponent(orderId)}`,
      payload: JSON.stringify({
        product: "petalyze_subscription",
        user_id: input.userId,
        plan_code: input.plan,
        billing_interval: input.billing,
      }),
      init_recurring: {
        interval_unit: input.billing === "monthly" ? "month" : "year",
        interval_count: 1,
        retry_attempts: 3,
        retry_interval_hours: 24,
        start_date: yyyyMmDd(nextCharge),
        notification_url: `${config.siteUrl}/api/payments/tranzzo/webhook`,
        amount,
      },
    },
  };
}
