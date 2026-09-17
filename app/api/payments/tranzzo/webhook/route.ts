import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  decodeTranzzoWebhookData,
  getTranzzoConfig,
  verifyTranzzoWebhook,
} from "@/lib/tranzzo/server";

export const runtime = "nodejs";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role is not configured.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function POST(req: NextRequest) {
  try {
    const config = getTranzzoConfig();
    if (!config.apiSecret) {
      console.error("Tranzzo webhook received without TRANZZO_API_SECRET configured");
      return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
    }

    const form = await req.formData();
    const data = String(form.get("data") || "");
    const signature = String(form.get("signature") || "");
    if (!data || !signature) {
      return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
    }

    if (!verifyTranzzoWebhook(data, signature, config.apiSecret)) {
      console.warn("Rejected Tranzzo webhook with invalid signature");
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    const event = decodeTranzzoWebhookData(data) as Record<string, unknown>;
    const recurring =
      event.recurring && typeof event.recurring === "object"
        ? (event.recurring as Record<string, unknown>)
        : {};

    const paymentId = text(event.payment_id) || text(event.transaction_id);
    const orderId = text(event.order_id);
    const status = text(event.status);
    const recurringId = text(recurring.id);

    if (!paymentId || !orderId || !status) {
      return NextResponse.json({ error: "Incomplete verified webhook." }, { status: 400 });
    }

    // One DB transaction performs deduplication + validation + subscription activation.
    // A duplicated Tranzzo webhook therefore cannot grant credits twice.
    const admin = adminClient();
    const { data: result, error } = await admin.rpc("petalyze_process_tranzzo_webhook", {
      p_event_key: `tranzzo:${paymentId}:${status}`,
      p_payment_id: paymentId,
      p_order_id: orderId,
      p_status: status,
      p_amount: numberOrNull(event.amount),
      p_currency: text(event.currency) || null,
      p_recurring_id: recurringId || null,
      p_raw_event: event,
    });

    if (error) {
      console.error("Verified Tranzzo webhook rejected by payment processor", error);
      return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
    }

    const row = Array.isArray(result) ? result[0] : result;
    console.info("Processed verified Tranzzo webhook", {
      payment_id: paymentId,
      order_id: orderId,
      status,
      result: row,
    });

    return NextResponse.json({ ok: true, result: row ?? null });
  } catch (error) {
    console.error("Tranzzo webhook error", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 400 });
  }
}
