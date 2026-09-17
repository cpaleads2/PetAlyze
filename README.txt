PetAlyze v0.10.2b — Subscription UI Integration

Pricing now reads public.user_subscriptions as the authoritative subscription state.

Adds:
- Current plan from user_subscriptions
- Subscription status: Free / Active / Past due / Canceled
- Billing interval: Monthly / Annual
- Current period end
- Renewal / cancel-at-period-end state
- Pricing switch follows the current paid subscription billing interval

Payments remain disabled. This is display/read integration only.

Requires:
v0.10.2a_subscription_foundation.sql already installed.

No SQL required for this patch.

Install:
Extract into the project root with replacement.
Open /pricing.

Expected for the current account:
- Free / Current plan
- Status: Free
- Billing: No paid billing
- Renewal: Free plan
