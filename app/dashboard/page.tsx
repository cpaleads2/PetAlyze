"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/app-shell";
import AuthGuard from "@/components/auth-guard";
import { supabase } from "@/lib/supabase/client";

type Pet = {
  id: string;
  name: string;
  species: string | null;
  breed: string | null;
  birth_date: string | null;
};

function monthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export default function Dashboard() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [journalCount, setJournalCount] = useState(0);
  const [storyCount, setStoryCount] = useState(0);
  const [name, setName] = useState("Pet lover");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();

      if (auth.user) {
        setName((auth.user.user_metadata?.name as string) || auth.user.email || "Pet lover");
      }

      const [{ data: petData }, { count: journalTotal }, { count: storyTotal }] =
        await Promise.all([
          supabase
            .from("pets")
            .select("id,name,species,breed,birth_date")
            .order("created_at", { ascending: false }),
          supabase
            .from("journal_entries")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("ai_stories")
            .select("*", { count: "exact", head: true })
            .gte("created_at", monthStartIso()),
        ]);

      setPets(petData || []);
      setJournalCount(journalTotal || 0);
      setStoryCount(storyTotal || 0);
      setLoading(false);
    }

    load();
  }, []);

  return (
    <AuthGuard>
      <AppShell>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">
              Your workspace
            </p>
            <h1 className="mt-1 text-3xl font-bold">Hello, {name} 👋</h1>
            <p className="mt-2 text-[var(--muted)]">
              Your account, pets, memories and AI stories are connected to Supabase.
            </p>
          </div>
          <Link href="/pets/new" className="btn btn-primary">+ Add pet</Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="card p-6">
            <p className="text-sm text-[var(--muted)]">Pets</p>
            <p className="mt-2 text-3xl font-bold">{loading ? "…" : pets.length}</p>
          </div>

          <Link href="/journal" className="card p-6">
            <p className="text-sm text-[var(--muted)]">Journal entries</p>
            <p className="mt-2 text-3xl font-bold">{loading ? "…" : journalCount}</p>
          </Link>

          <Link href="/ai-story" className="card p-6">
            <p className="text-sm text-[var(--muted)]">AI stories this month</p>
            <p className="mt-2 text-3xl font-bold">{loading ? "…" : `${storyCount} / 1`}</p>
          </Link>
        </div>

        <div className="mt-6 card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Your pets</h2>
            <Link className="text-sm font-bold text-[var(--green)]" href="/pets/new">
              Add another →
            </Link>
          </div>

          {loading ? (
            <p className="mt-5 text-[var(--muted)]">Loading pets…</p>
          ) : pets.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-[var(--cream)] p-6">
              <div className="text-5xl">🐾</div>
              <h3 className="mt-4 text-xl font-bold">Add your first pet</h3>
              <p className="mt-2 text-[var(--muted)]">
                Create a real profile and it will stay here after you close the browser.
              </p>
              <Link href="/pets/new" className="btn btn-primary mt-5">
                Create pet profile
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {pets.map((pet) => (
                <Link
                  key={pet.id}
                  href={`/pets/${pet.id}`}
                  className="rounded-2xl border border-[var(--line)] p-5 hover:bg-[var(--cream)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--mint)] text-4xl">
                      {pet.species?.toLowerCase() === "cat"
                        ? "🐈"
                        : pet.species?.toLowerCase() === "bird"
                        ? "🐦"
                        : pet.species?.toLowerCase() === "rabbit"
                        ? "🐇"
                        : "🐕"}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{pet.name}</h3>
                      <p className="text-sm text-[var(--muted)]">
                        {[pet.breed, pet.species].filter(Boolean).join(" · ") || "Pet profile"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
