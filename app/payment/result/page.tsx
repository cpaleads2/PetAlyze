import Link from "next/link";

export default function PaymentResultPage() {
  return (
    <main className="container py-20">
      <div className="card mx-auto max-w-2xl p-8 text-center">
        <div className="text-5xl">🐾</div>
        <h1 className="mt-4 text-3xl font-bold">Payment received</h1>
        <p className="mt-4 text-[var(--muted)]">
          We are checking the payment status. Your PetAlyze plan is activated only after a verified server notification from the payment provider.
        </p>
        <Link href="/pricing" className="btn btn-primary mt-7 inline-flex">
          Back to plans
        </Link>
      </div>
    </main>
  );
}
