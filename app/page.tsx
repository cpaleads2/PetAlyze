import Link from "next/link";
import SiteHeader from "@/components/site-header";

const features = [
  ["♡", "Journal & Memories", "Save everyday moments, milestones, routines and meaningful memories in your pet's timeline."],
  ["▣", "Digital Pet Passport", "Keep your pet's profile, vaccinations, microchip and other important information organized in one place."],
  ["▧", "Media Library", "Keep your pet photos together and choose identity references for AI-powered creative tools."],
  ["✦", "AI Stories", "Turn a real pet moment into a personalized story and social-ready caption."],
  ["◉", "AI Illustrations", "Transform your pet photos into creative AI illustrations while using your selected pet references."],
  ["▦", "AI Comics", "Create four-panel visual stories inspired by your pet, photos and moments."],
];

const plans = [
  {name:"Free", price:"$0", period:"", credits:"30 AI credits / month", pets:"1 pet profile", items:["Journal & memories","Digital Pet Passport","Media Library","AI creation with included credits"]},
  {name:"Plus", price:"$7.99", period:" / month", credits:"400 AI credits / month", pets:"Up to 3 pets", popular:true, items:["Everything in Free","More AI Stories & Illustrations","AI Comics","AI Video Lite when available"]},
  {name:"Pro", price:"$14.99", period:" / month", credits:"800 AI credits / month", pets:"More pets", items:["Everything in Plus","More room for AI creation","AI Video Lite + Fast when available","Designed for active creators"]},
];

export default function Home(){
  return <main>
    <SiteHeader/>
    <section className="hero-grid">
      <div className="container grid min-h-[650px] items-center gap-12 py-20 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm shadow-sm"><span className="text-[var(--green)]">●</span>Your pet's life, memories and creativity in one place</div>
          <h1 className="max-w-3xl text-5xl font-bold tracking-[-.04em] sm:text-6xl lg:text-7xl">Every pet has a story. <span className="text-[var(--green)]">Make it unforgettable.</span></h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--muted)]">PetAlyze is a digital service for pet owners that combines a pet profile, journal, passport and media library with AI tools for stories, illustrations and comics.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link href="/signup" className="btn btn-primary px-7">Start free →</Link><Link href="/#features" className="btn btn-secondary px-7">Explore features</Link></div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--muted)]"><span>✓ Free plan</span><span>✓ No card required to start</span><span>✓ Built for pet owners</span></div>
        </div>
        <div className="card mx-auto w-full max-w-md p-5">
          <div className="rounded-3xl bg-[var(--cream)] p-6">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">PetAlyze profile</p><h2 className="mt-1 text-2xl font-bold">Luna 🐶</h2></div><span className="rounded-2xl bg-white px-3 py-2 text-sm">My pet</span></div>
            <div className="mt-6 flex h-52 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-100 via-white to-sky-100 text-8xl">🐕</div>
            <div className="mt-5 grid grid-cols-3 gap-3"><div className="rounded-2xl bg-white p-3"><p className="text-xs text-[var(--muted)]">Journal</p><b>Memories</b></div><div className="rounded-2xl bg-white p-3"><p className="text-xs text-[var(--muted)]">Passport</p><b>Details</b></div><div className="rounded-2xl bg-white p-3"><p className="text-xs text-[var(--muted)]">AI Studio</p><b>Create</b></div></div>
          </div>
        </div>
      </div>
    </section>

    <section id="features" className="container py-24">
      <div className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">Remember more. Create more.</p><h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">A digital home for your pet's story.</h2><p className="mt-5 max-w-2xl leading-7 text-[var(--muted)]">Keep the practical details and the moments you love together, then use those moments as inspiration for personalized AI content.</p></div>
      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{features.map(([icon,title,text])=><article className="card p-7" key={title}><div className="paw">{icon}</div><h3 className="mt-6 text-xl font-bold">{title}</h3><p className="mt-3 leading-7 text-[var(--muted)]">{text}</p></article>)}</div>
    </section>

    <section id="how" className="bg-[var(--cream)] py-24">
      <div className="container"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">How PetAlyze works</p><h2 className="mt-3 text-4xl font-bold">From everyday moments to lasting memories.</h2></div>
      <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
        {[ ["01","Create your pet profile","Add your pet and keep key information in a digital profile and passport."], ["02","Save photos and moments","Build a journal and media library around the life you share with your pet."], ["03","Create with AI","Use credits for stories, illustrations and comics based on your pet moments and photos."] ].map(([n,t,x])=><div className="card p-7" key={n}><div className="text-sm font-bold text-[var(--green)]">{n}</div><h3 className="mt-8 text-xl font-bold">{t}</h3><p className="mt-3 leading-7 text-[var(--muted)]">{x}</p></div>)}
      </div></div>
    </section>

    <section className="container py-24">
      <div className="grid gap-8 rounded-[32px] bg-[var(--ink)] p-8 text-white md:p-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
        <div><p className="text-sm font-bold uppercase tracking-[.18em] text-emerald-300">Made to be shared</p><h2 className="mt-3 text-4xl font-bold">Turn pet memories into content.</h2></div>
        <div><p className="leading-8 text-white/70">PetAlyze can help create stories, illustrations, comics and captions that you can publish on social platforms such as Instagram, TikTok and YouTube. If your content and account qualify for a platform's own monetization program, you may monetize it there under that platform's rules.</p><p className="mt-4 text-sm text-white/50">PetAlyze does not guarantee social reach, eligibility or earnings from third-party platforms.</p></div>
      </div>
    </section>

    <section id="pricing" className="container pb-24 pt-8">
      <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">Plans & pricing</p><h2 className="mt-3 text-4xl font-bold">Start free. Choose more AI credits when you need them.</h2><p className="mt-4 text-[var(--muted)]">Paid subscriptions are shown for product transparency and will become available after payment processing is activated.</p></div>
      <div className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-3">{plans.map(plan=><div className={`card relative p-8 ${plan.popular?"border-2 border-[var(--green)]":""}`} key={plan.name}>{plan.popular&&<span className="absolute -top-3 left-7 rounded-full bg-[var(--green)] px-3 py-1 text-xs font-bold text-white">Popular</span>}<p className="text-xl font-bold">{plan.name}</p><div className="mt-3 text-4xl font-bold">{plan.price}<span className="text-base font-normal text-[var(--muted)]">{plan.period}</span></div><div className="mt-5 rounded-2xl bg-[var(--mint)] p-4"><b className="text-[var(--green)]">{plan.credits}</b><p className="mt-1 text-sm text-[var(--muted)]">{plan.pets}</p></div><ul className="mt-6 space-y-3 text-sm text-[var(--muted)]">{plan.items.map(x=><li key={x}>✓ {x}</li>)}</ul>{plan.name==="Free"?<Link href="/signup" className="btn btn-secondary mt-8 w-full">Start free</Link>:<div className="mt-8 rounded-full border border-[var(--line)] px-5 py-3 text-center text-sm font-bold text-[var(--muted)]">Paid checkout not yet enabled</div>}</div>)}</div>
      <div className="mt-7 text-center"><Link href="/signup" className="btn btn-primary px-7">Create your free account →</Link></div>
    </section>

    <footer className="bg-[var(--ink)] py-10 text-white"><div className="container flex flex-col gap-5 text-sm md:flex-row md:items-center md:justify-between"><b>🐾 PetAlyze</b><span className="text-white/60">© 2026 PetAlyze · Digital services for pet owners</span><div className="flex flex-wrap gap-5 text-white/70"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/refund">Refunds</Link><Link href="/contact">Contact</Link><a href="mailto:support@petalyzeai.com">support@petalyzeai.com</a></div></div></footer>
  </main>
}
