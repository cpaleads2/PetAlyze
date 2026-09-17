import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildSubscriptionCheckout,
  getTranzzoConfig,
  signTranzzoRequest,
  type BillingInterval,
  type PetAlyzePaidPlan,
} from "@/lib/tranzzo/server";

export const runtime = "nodejs";

type CheckoutBody = { plan?: string; billing?: string };

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role is not configured.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    const config = getTranzzoConfig();
    if (!config.checkoutEnabled) {
      return NextResponse.json(
        { error: "Tranzzo checkout is prepared but not enabled yet." },
        { status: 503 }
      );
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid session. Please log in again." }, { status: 401 });
    }

    const input = (await req.json()) as CheckoutBody;
    if (!(["plus", "pro"] as string[]).includes(input.plan || "")) {
      return NextResponse.json({ error: "Invalid paid plan." }, { status: 400 });
    }
    if (!(["monthly", "annual"] as string[]).includes(input.billing || "")) {
      return NextResponse.json({ error: "Invalid billing interval." }, { status: 400 });
    }

    const plan = input.plan as PetAlyzePaidPlan;
    const billing = input.billing as BillingInterval;
    const checkout = buildSubscriptionCheckout({
      userId: user.id,
      email: user.email,
      plan,
      billing,
    });

    // Persist our own authoritative order before sending the customer to Tranzzo.
    // Webhooks never trust user_id/plan/price from provider payload alone.
    const admin = adminClient();
    const { error: registerError } = await admin.rpc("petalyze_register_tranzzo_order", {
      p_order_id: checkout.orderId,
      p_user_id: user.id,
      p_plan_code: plan,
      p_billing_interval: billing,
      p_amount: checkout.body.amount,
      p_currency: checkout.body.currency,
    });
    if (registerError) {
      console.error("Unable to register Tranzzo order", registerError);
      return NextResponse.json({ error: "Unable to prepare payment order." }, { status: 500 });
    }

    const rawBody = JSON.stringify(checkout.body);
    const signature = signTranzzoRequest(rawBody, config.apiSecret);

    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-AUTH": `CPAY-HMAC-SHA256 ${config.apiKey}:${signature}`,
        "X-API-KEY": config.endpointsKey,
      },
      body: rawBody,
      redirect: "manual",
    });

    const location = response.headers.get("location");
    if (response.status === 303 && location) {
      return NextResponse.json({ checkout_url: location, order_id: checkout.orderId });
    }

    const responseText = await response.text();
    console.error("Tranzzo checkout creation failed", response.status, responseText.slice(0, 1000));
    return NextResponse.json(
      { error: "Unable to create Tranzzo checkout.", provider_status: response.status },
      { status: 502 }
    );
  } catch (error) {
    console.error("Tranzzo checkout error", error);
    return NextResponse.json({ error: "Unable to create Tranzzo checkout." }, { status: 500 });
  }
}
