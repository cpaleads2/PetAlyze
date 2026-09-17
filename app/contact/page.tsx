import Link from "next/link";

export const metadata = { title: "Contact — PetAlyze" };

export default function ContactPage() {
  return <main className="container py-16">
    <Link href="/" className="font-bold text-[var(--green)]">← PetAlyze</Link>
    <div className="card mt-8 max-w-4xl p-8 md:p-10">
      <h1 className="text-4xl font-bold">Contact PetAlyze</h1>
      <p className="mt-5 max-w-2xl leading-7 text-[var(--muted)]">Need help with your account, PetAlyze features, privacy, billing or a future paid subscription? For help with your account, PetAlyze features, privacy, billing or subscriptions, contact our customer support team.</p>
      <div className="mt-8 rounded-3xl bg-[var(--cream)] p-6">
        <h2 className="text-xl font-bold">Customer support</h2>
        <p className="mt-3 leading-7 text-[var(--muted)]">Support email: <a href="mailto:support@petalyzeai.com" className="font-semibold text-[var(--green)] underline">support@petalyzeai.com</a></p>
        <p className="mt-2 text-sm text-[var(--muted)]">For payment questions, include your PetAlyze account email and transaction date. Never send your full card number, CVV or passwords.</p>
      </div>
      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/privacy" className="font-semibold text-[var(--green)] underline">Privacy Policy</Link>
        <Link href="/terms" className="font-semibold text-[var(--green)] underline">Terms of Service</Link>
        <Link href="/refund" className="font-semibold text-[var(--green)] underline">Refund Policy</Link>
      </div>
    </div>
  </main>;
}
