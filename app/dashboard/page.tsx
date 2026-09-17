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

type JournalEntry = {
  id: string;
  title: string;
  content: string;
  entry_date: string;
  pet_id: string;
  pets: { name: string } | { name: string }[] | null;
};

type Story = {
  id: string;
  title: string;
  created_at: string;
  pet_id: string;
  pets: { name: string } | { name: string }[] | null;
};

type CreditAccount = {
  plan_code: "free" | "plus" | "pro";
  subscription_credits: number;
  purchased_credits: number;
};

const PLAN_LABELS: Record<CreditAccount["plan_code"], string> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
};

const PLAN_MONTHLY_CREDITS: Record<CreditAccount["plan_code"], number> = {
  free: 30,
  plus: 400,
  pro: 800,
};

type Vaccination = {
  id: string;
  vaccine_name: string;
  next_due_date: string | null;
  pet_id: string;
  pets: { name: string } | { name: string }[] | null;
};

function monthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function relationName(
  relation: { name: string } | { name: string }[] | null
) {
  if (Array.isArray(relation)) return relation[0]?.name || "Pet";
  return relation?.name || "Pet";
}

export default function Dashboard() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [journalCount, setJournalCount] = useState(0);
  const [storyCount, setStoryCount] = useState(0);
  const [latestJournal, setLatestJournal] = useState<JournalEntry | null>(null);
  const [latestStory, setLatestStory] = useState<Story | null>(null);
  const [nextVaccination, setNextVaccination] = useState<Vaccination | null>(null);
  const [name, setName] = useState("Pet lover");
  const [loading, setLoading] = useState(true);
  const [creditAccount, setCreditAccount] = useState<CreditAccount | null>(null);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();

      if (auth.user) {
        setName(
          (auth.user.user_metadata?.name as string) ||
            auth.user.email ||
            "Pet lover"
        );
      }

      // Refresh an expired monthly credit period before reading the balance.
      if (auth.user) {
        const { error: refreshError } = await supabase.rpc(
          "petalyze_refresh_credit_period"
        );
        if (refreshError) {
          console.error("Credit period refresh failed:", refreshError.message);
        }
      }

      const [
        { data: petData },
        { count: journalTotal },
        { count: storyTotal },
        { data: journalData },
        { data: storyData },
        { data: vaccinationData },
        { data: creditData },
      ] = await Promise.all([
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

        supabase
          .from("journal_entries")
          .select("id,title,content,entry_date,pet_id,pets(name)")
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1),

        supabase
          .from("ai_stories")
          .select("id,title,created_at,pet_id,pets(name)")
          .order("created_at", { ascending: false })
          .limit(1),

        supabase
          .from("pet_vaccinations")
          .select("id,vaccine_name,next_due_date,pet_id,pets(name)")
          .not("next_due_date", "is", null)
          .gte("next_due_date", new Date().toISOString().slice(0, 10))
          .order("next_due_date", { ascending: true })
          .limit(1),

        supabase
          .from("user_credit_accounts")
          .select("plan_code,subscription_credits,purchased_credits")
          .maybeSingle(),
      ]);

      setPets(petData || []);
      setJournalCount(journalTotal || 0);
      setStoryCount(storyTotal || 0);
      setLatestJournal((journalData?.[0] as JournalEntry) || null);
      setLatestStory((storyData?.[0] as Story) || null);
      setNextVaccination((vaccinationData?.[0] as Vaccination) || null);
      setCreditAccount((creditData as CreditAccount) || null);
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
              Your pets, memories, stories and passport details in one place.
            </p>
          </div>

          <Link href="/pets/new" className="btn btn-primary">
            + Add pet
          </Link>
        </div>


        <div className="mb-6 card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--green)]">
                Your plan
              </p>
              <p className="mt-2 text-2xl font-bold">
                {loading ? "…" : PLAN_LABELS[creditAccount?.plan_code || "free"]}
              </p>
            </div>

            <div className="sm:text-right">
              <p className="text-sm text-[var(--muted)]">AI Credits</p>
              <p className="mt-1 text-3xl font-bold">
                {loading
                  ? "…"
                  : creditAccount
                  ? `${creditAccount.subscription_credits + creditAccount.purchased_credits} / ${PLAN_MONTHLY_CREDITS[creditAccount.plan_code]}`
                  : "—"}
              </p>
              {creditAccount && creditAccount.purchased_credits > 0 && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Includes {creditAccount.purchased_credits} purchased credits
                </p>
              )}
              <Link
                href="/pricing"
                className="mt-3 inline-block text-sm font-bold text-[var(--green)]"
              >
                View plans →
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="card p-6">
            <p className="text-sm text-[var(--muted)]">Pets</p>
            <p className="mt-2 text-3xl font-bold">
              {loading ? "…" : pets.length}
            </p>
          </div>

          <Link href="/journal" className="card p-6">
            <p className="text-sm text-[var(--muted)]">Journal entries</p>
            <p className="mt-2 text-3xl font-bold">
              {loading ? "…" : journalCount}
            </p>
          </Link>

          <Link href="/ai-story" className="card p-6">
            <p className="text-sm text-[var(--muted)]">AI stories this month</p>
            <p className="mt-2 text-3xl font-bold">
              {loading ? "…" : storyCount}
            </p>
          </Link>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="card p-6">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--green)]">
              Latest memory
            </p>

            {latestJournal ? (
              <>
                <p className="mt-4 text-sm text-[var(--muted)]">
                  {relationName(latestJournal.pets)} · {latestJournal.entry_date}
                </p>
                <h2 className="mt-2 text-xl font-bold">{latestJournal.title}</h2>
                <p className="mt-3 line-clamp-3 leading-7 text-[var(--muted)]">
                  {latestJournal.content}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/journal"
                    className="font-bold text-[var(--green)]"
                  >
                    Open journal →
                  </Link>

                  <Link
                    href={`/ai-story?pet_id=${encodeURIComponent(
                      latestJournal.pet_id
                    )}&memory=${encodeURIComponent(latestJournal.content)}`}
                    className="font-bold text-[var(--green)]"
                  >
                    Create AI Story →
                  </Link>
                </div>
              </>
            ) : (
              <div className="mt-4">
                <p className="text-[var(--muted)]">
                  No journal entries yet.
                </p>
                <Link
                  href="/journal"
                  className="mt-4 inline-block font-bold text-[var(--green)]"
                >
                  Add first memory →
                </Link>
              </div>
            )}
          </div>

          <div className="card p-6">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--green)]">
              Latest AI Story
            </p>

            {latestStory ? (
              <>
                <p className="mt-4 text-sm text-[var(--muted)]">
                  {relationName(latestStory.pets)}
                </p>
                <h2 className="mt-2 text-xl font-bold">{latestStory.title}</h2>
                <p className="mt-3 text-[var(--muted)]">
                  Saved in your Story Library.
                </p>
                <Link
                  href={`/stories/${latestStory.id}`}
                  className="mt-5 inline-block font-bold text-[var(--green)]"
                >
                  Read story →
                </Link>
              </>
            ) : (
              <div className="mt-4">
                <p className="text-[var(--muted)]">
                  No AI stories yet.
                </p>
                <Link
                  href="/ai-story"
                  className="mt-4 inline-block font-bold text-[var(--green)]"
                >
                  Create first story →
                </Link>
              </div>
            )}
          </div>

          <div className="card p-6">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--green)]">
              Pet Passport
            </p>

            {nextVaccination ? (
              <>
                <p className="mt-4 text-sm text-[var(--muted)]">
                  {relationName(nextVaccination.pets)}
                </p>
                <h2 className="mt-2 text-xl font-bold">
                  {nextVaccination.vaccine_name}
                </h2>
                <p className="mt-3 text-[var(--muted)]">
                  Next due: {nextVaccination.next_due_date}
                </p>
                <Link
                  href={`/pets/${nextVaccination.pet_id}/passport`}
                  className="mt-5 inline-block font-bold text-[var(--green)]"
                >
                  Open passport →
                </Link>
              </>
            ) : (
              <div className="mt-4">
                <p className="text-[var(--muted)]">
                  No upcoming vaccination dates.
                </p>
                {pets[0] && (
                  <Link
                    href={`/pets/${pets[0].id}/passport`}
                    className="mt-4 inline-block font-bold text-[var(--green)]"
                  >
                    Open Pet Passport →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Your pets</h2>
            <Link
              className="text-sm font-bold text-[var(--green)]"
              href="/pets/new"
            >
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
                        {[pet.breed, pet.species]
                          .filter(Boolean)
                          .join(" · ") || "Pet profile"}
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
