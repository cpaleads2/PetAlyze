import Link from "next/link";
export default function SiteHeader(){
  return <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/90 backdrop-blur">
    <div className="container flex h-18 items-center justify-between">
      <Link href="/" className="flex items-center gap-2 text-xl font-bold"><span className="paw">🐾</span>PetAlyze</Link>
      <nav className="hidden items-center gap-7 text-sm text-[var(--muted)] md:flex">
        <Link href="/#features">Features</Link><Link href="/#how">How it works</Link><Link href="/#pricing">Pricing</Link>
      </nav>
      <div className="flex items-center gap-2"><Link href="/login" className="btn btn-secondary hidden sm:inline-flex">Log in</Link><Link href="/signup" className="btn btn-primary">Start free</Link></div>
    </div>
  </header>
}
