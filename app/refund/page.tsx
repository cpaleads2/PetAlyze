import Link from "next/link";

export const metadata = { title: "Refund Policy — PetAlyze" };

export default function RefundPage() {
  return <main className="container py-16">
    <Link href="/" className="font-bold text-[var(--green)]">← PetAlyze</Link>
    <article className="card mt-8 max-w-4xl p-8 md:p-10">
      <h1 className="text-4xl font-bold">Refund Policy</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">Effective: September 5, 2026</p>
      <div className="mt-8 space-y-8 leading-7 text-[var(--muted)]">
        <section><h2 className="text-xl font-bold text-[var(--ink)]">1. Digital services</h2><p className="mt-2">PetAlyze provides digital services and AI-powered features. There are no physical goods to return. This policy will apply when paid subscriptions and other paid digital services become available.</p></section>
        <section><h2 className="text-xl font-bold text-[var(--ink)]">2. Subscription cancellation</h2><p className="mt-2">You may request cancellation of a recurring subscription so that it does not renew for a future billing period. Unless applicable law requires otherwise or a refund is approved under this policy, cancellation does not automatically refund charges already processed for the current billing period, and access may continue through the paid period.</p></section>
        <section><h2 className="text-xl font-bold text-[var(--ink)]">3. Duplicate or incorrect charges</h2><p className="mt-2">If you believe you were charged more than once for the same purchase, charged an incorrect amount or charged after a cancellation should have taken effect, contact us. We will review the payment record and, where confirmed, arrange the appropriate correction or refund.</p></section>
        <section><h2 className="text-xl font-bold text-[var(--ink)]">4. Technical failures</h2><p className="mt-2">For an AI generation that fails technically, PetAlyze may restore the credits used for that generation rather than issue a cash refund. If a broader paid service was materially unavailable because of a verified technical problem, contact us and we will review the circumstances.</p></section>
        <section><h2 className="text-xl font-bold text-[var(--ink)]">5. Completed AI outputs</h2><p className="mt-2">AI results are inherently variable. A technically completed generation that does not match personal taste does not automatically qualify for a cash refund. We may review reported broken or unusable results and, where appropriate, restore credits as a service remedy.</p></section>
        <section><h2 className="text-xl font-bold text-[var(--ink)]">6. Mandatory consumer rights</h2><p className="mt-2">Nothing in this policy limits refund, cancellation or withdrawal rights that apply to you under mandatory consumer-protection law. Where such law gives you stronger rights, those rights prevail.</p></section>
        <section><h2 className="text-xl font-bold text-[var(--ink)]">7. Requesting a review</h2><p className="mt-2">Use our <Link href="/contact" className="font-semibold text-[var(--green)] underline">Contact page</Link> and include the email used for your PetAlyze account, the approximate transaction date and a short description of the issue. Do not send full payment-card details.</p></section>
      </div>
    </article>
  </main>;
}
