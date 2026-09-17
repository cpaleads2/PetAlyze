# PetAlyze v0.11.0a — Tranzzo Integration Foundation

Prepared against the current uploaded PetAlyze project.

## Added
- Server-only Tranzzo HMAC-SHA256 API request signing.
- Hosted recurring checkout builder for Plus/Pro monthly and annual plans.
- Authenticated checkout API route.
- Tranzzo webhook endpoint with documented SHA1/Base64URL signature verification.
- Safe payment result page.
- Tranzzo environment variable placeholders.
- `TRANZZO_CHECKOUT_ENABLED=false` safety switch.

## Important
This stage intentionally does **not** activate subscriptions from webhooks yet.
The verified webhook is accepted and logged, but v0.11.0b will add durable idempotency and trusted database state changes.

Pricing buttons remain unchanged/disabled in this stage, so installing v0.11.0a cannot start a real payment by itself.

Do not put real credentials in `.env.local.example` and do not commit `.env.local`.
