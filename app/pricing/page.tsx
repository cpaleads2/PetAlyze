"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/app-shell";
import AuthGuard from "@/components/auth-guard";
import { supabase } from "@/lib/supabase/client";

type PlanCode = "free" | "plus" | "pro";
type Billing = "monthly" | "annual";

type SubscriptionState = {
  plan_code: PlanCode;
  status: "free" | "active" | "past_due" | "canceled";
  billing_interval: Billing | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

const PLANS = [
  {
    code: "free" as PlanCode,
    name: "Free",
    monthly: 0,
    annual: 0,
    credits: 30,
    pets: "1 pet",
    video: "No AI Video",
    features: [
      "Pet profile",
      "Journal & memories",
      "Pet Passport",
      "Media Library",
      "AI features using credits",
    ],
  },
  {
    code: "plus" as PlanCode,
    name: "Plus",
    monthly: 7.99,
    annual: 79.99,
    credits: 400,
    pets: "Up to 3 pets",
    video: "AI Video Lite",
    features: [
      "Everything in Free",
      "400 AI credits every month",
      "AI Stories & Illustrations",
      "AI Comics",
      "AI Video Lite when launched",
    ],
  },
  {
    code: "pro" as PlanCode,
    name: "Pro",
    monthly: 14.99,
    annual: 149.99,
    credits: 800,
    pets: "More pets",
    video: "AI Video Lite + Fast",
    features: [
      "Everything in Plus",
      "800 AI credits every month",
      "More room for AI creation",
      "AI Video Lite + Fast when launched",
      "Best for active creators",
    ],
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [currentPlan, setCurrentPlan] = useState<PlanCode>("free");
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("user_subscriptions")
        .select("plan_code,status,billing_interval,current_period_start,current_period_end,cancel_at_period_end")
        .maybeSingle();

      if (data?.plan_code) {
        const state = data as SubscriptionState;
        setSubscription(state);
        setCurrentPlan(state.plan_code);
        if (state.billing_interval) setBilling(state.billing_interval);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <AuthGuard>
      <AppShell>
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">
              Plans & pricing
            </p>
            <h1 className="mt-2 text-4xl font-bold">Choose how you create with PetAlyze</h1>
            <p className="mx-auto mt-3 max-w-2xl text-[var(--muted)]">
              Every plan includes the core pet experience. AI credits are used for stories,
              illustrations, comics and future video creation.
            </p>

            <div className="mt-7 inline-flex rounded-full border border-[var(--line)] bg-white p-1">
              <button
                type="button"
                onClick={() => setBilling("monthly")}
                className={`rounded-full px-5 py-2 text-sm font-bold ${
                  billing === "monthly" ? "bg-[var(--green)] text-white" : ""
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling("annual")}
                className={`rounded-full px-5 py-2 text-sm font-bold ${
                  billing === "annual" ? "bg-[var(--green)] text-white" : ""
                }`}
              >
                Annual · save about 2 months
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {PLANS.map((plan) => {
              const isCurrent = !loading && currentPlan === plan.code;
              const price = billing === "monthly" ? plan.monthly : plan.annual;

              return (
                <div
                  key={plan.code}
                  className={`card relative p-7 ${
                    plan.code === "plus" ? "ring-2 ring-[var(--green)]" : ""
                  }`}
                >
                  {plan.code === "plus" && (
                    <div className="absolute -top-3 left-6 rounded-full bg-[var(--green)] px-3 py-1 text-xs font-bold text-white">
                      Popular
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">{plan.name}</h2>
                      <p className="mt-1 text-sm text-[var(--muted)]">{plan.pets}</p>
                    </div>
                    {isCurrent && (
                      <span className="rounded-full bg-[var(--mint)] px-3 py-1 text-xs font-bold text-[var(--green)]">
                        Current plan
                      </span>
                    )}
                  </div>

                  <div className="mt-6">
                    <span className="text-4xl font-bold">
                      ${price === 0 ? "0" : price.toFixed(2)}
                    </span>
                    <span className="text-[var(--muted)]">
                      {billing === "monthly" ? " / month" : " / year"}
                    </span>
                  </div>

                  {billing === "annual" && plan.annual > 0 && (
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      ${(plan.annual / 12).toFixed(2)} average per month
                    </p>
                  )}

                  <div className="mt-6 rounded-2xl bg-[var(--mint)] p-4">
                    <p className="text-sm text-[var(--muted)]">AI Credits</p>
                    <p className="mt-1 text-2xl font-bold text-[var(--green)]">
                      {plan.credits} / month
                    </p>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    {plan.features.map((feature) => (
                      <p key={feature}>✓ {feature}</p>
                    ))}
                    <p>✓ {plan.video}</p>
                  </div>

                  <button
                    type="button"
                    disabled={isCurrent || plan.code !== "free"}
                    className={`mt-7 w-full rounded-full px-5 py-3 font-bold ${
                      isCurrent
                        ? "border border-[var(--line)] bg-white text-[var(--muted)]"
                        : plan.code === "free"
                        ? "border border-[var(--line)] bg-white"
                        : "bg-[var(--green)] text-white opacity-70"
                    }`}
                    title={plan.code !== "free" && !isCurrent ? "Payments will be enabled after Tranzzo integration." : undefined}
                  >
                    {isCurrent
                      ? "Current plan"
                      : plan.code === "free"
                      ? "Free"
                      : "Coming with payments"}
                  </button>
                </div>
              );
            })}
          </div>

          {!loading && subscription && (
            <div className="mt-7 card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[.16em] text-[var(--green)]">
                    Your subscription
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    {subscription.plan_code.charAt(0).toUpperCase() + subscription.plan_code.slice(1)}
                  </h2>
                </div>
                <span className="rounded-full bg-[var(--mint)] px-3 py-1 text-xs font-bold text-[var(--green)]">
                  {subscription.status === "free"
                    ? "Free"
                    : subscription.status.replace("_", " ")}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-2xl bg-[var(--cream)] p-4">
                  <span className="text-[var(--muted)]">Billing</span>
                  <p className="mt-1 font-bold">
                    {subscription.billing_interval
                      ? subscription.billing_interval.charAt(0).toUpperCase() + subscription.billing_interval.slice(1)
                      : "No paid billing"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--cream)] p-4">
                  <span className="text-[var(--muted)]">Current period</span>
                  <p className="mt-1 font-bold">
                    {subscription.current_period_end
                      ? `Until ${new Date(subscription.current_period_end).toLocaleDateString()}`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--cream)] p-4">
                  <span className="text-[var(--muted)]">Renewal</span>
                  <p className="mt-1 font-bold">
                    {subscription.plan_code === "free"
                      ? "Free plan"
                      : subscription.cancel_at_period_end
                      ? "Cancels at period end"
                      : "Renews automatically"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-7 card p-6">
            <h2 className="text-xl font-bold">How AI Credits work</h2>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-[var(--cream)] p-4"><b>AI Story</b><br />2 credits</div>
              <div className="rounded-2xl bg-[var(--cream)] p-4"><b>AI Illustration</b><br />8 credits</div>
              <div className="rounded-2xl bg-[var(--cream)] p-4"><b>AI Comic</b><br />32 credits / 4 panels</div>
              <div className="rounded-2xl bg-[var(--cream)] p-4"><b>AI Video</b><br />100+ credits · coming later</div>
            </div>
            <p className="mt-4 text-sm text-[var(--muted)]">
              Subscription credits refresh each billing period and do not roll over.
              Future purchased Credit Packs will be kept separately.
            </p>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
