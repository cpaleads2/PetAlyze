PetAlyze v0.11.0b — Tranzzo Webhook + Idempotency

WHAT THIS PATCH DOES
- Stores a server-created payment order before redirecting to Tranzzo.
- Adds X-API-KEY / TRANZZO_ENDPOINTS_KEY to Tranzzo API calls.
- Verifies Tranzzo webhook signature using the existing v0.11.0a verifier.
- Processes verified webhooks through one atomic Supabase RPC.
- Duplicate webhook deliveries cannot activate the subscription or grant credits twice.
- Successful payment is checked against the server-stored order amount/currency.
- Only then is the existing trusted v0.10.2c subscription activation called.
- Browser users cannot read/write payment tables or call payment RPCs.

SAFETY
TRANZZO_CHECKOUT_ENABLED remains false.
No real payment is enabled by this patch.

INSTALL — STEP 1
Run:
supabase/v0.11.0b_tranzzo_webhook_idempotency.sql
in Supabase SQL Editor.

Expected:
Success. No rows returned.

INSTALL — STEP 2 (later, not needed just to keep the site running)
Add these server-only values to .env.local before testing Tranzzo:
SUPABASE_SERVICE_ROLE_KEY=...
TRANZZO_ENDPOINTS_KEY=...

Never commit .env.local and never send secret values in chat.

NOTE
v0.11.0b intentionally handles verified payment success first.
Cancellation/renewal provider-event mapping will be added only against confirmed
Tranzzo event semantics, rather than guessed from generic status names.
