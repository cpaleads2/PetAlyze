import Link from "next/link";
import LogoutButton from "@/components/logout-button";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <div className="container grid min-h-screen gap-6 py-6 lg:grid-cols-[230px_1fr]">
        <aside className="card h-fit p-4 lg:sticky lg:top-6">
          <Link
            href="/"
            className="mb-6 flex items-center gap-2 px-2 text-lg font-bold"
          >
            <span className="paw">🐾</span>
            PetAlyze
          </Link>

          <nav className="space-y-1 text-sm">
            <Link className="sidebar-link" href="/dashboard">
              🏠 Dashboard
            </Link>

            <Link className="sidebar-link" href="/pets/new">
              ➕ Add pet
            </Link>

            <Link className="sidebar-link" href="/journal">
              📖 Journal
            </Link>

            <Link className="sidebar-link" href="/ai-story">
              ✨ AI Story
            </Link>

            <Link className="sidebar-link" href="/stories">
              📚 Story Library
            </Link>
          </nav>

          <div className="mt-6 border-t border-[var(--line)] pt-4">
            <Link className="sidebar-link" href="/">
              ← Back to website
            </Link>

            <LogoutButton />
          </div>
        </aside>

        <section>{children}</section>
      </div>
    </div>
  );
}