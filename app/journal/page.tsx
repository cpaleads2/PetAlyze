"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/app-shell";
import AuthGuard from "@/components/auth-guard";
import { supabase } from "@/lib/supabase/client";

type Pet = { id: string; name: string };
type Entry = {
  id: string;
  title: string;
  entry_date: string;
  category: string;
  content: string;
  pet_id: string;
  pets: { name: string } | { name: string }[] | null;
};

function getPetName(entry: Entry) {
  if (Array.isArray(entry.pets)) return entry.pets[0]?.name || "Pet";
  return entry.pets?.name || "Pet";
}

export default function JournalPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);

    const [{ data: petData, error: petError }, { data: entryData, error: entryError }] =
      await Promise.all([
        supabase.from("pets").select("id,name").order("created_at", { ascending: true }),
        supabase
          .from("journal_entries")
          .select("id,title,entry_date,category,content,pet_id,pets(name)")
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

    if (!petError) setPets(petData || []);
    if (!entryError) setEntries((entryData || []) as Entry[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formElement = e.currentTarget;
    const form = new FormData(formElement);

    setSaving(true);
    setMessage("");

    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth.user) {
      setSaving(false);
      setMessage("Please log in again.");
      return;
    }

    const payload = {
      user_id: auth.user.id,
      pet_id: String(form.get("pet_id") || ""),
      title: String(form.get("title") || "").trim(),
      entry_date: String(form.get("entry_date") || ""),
      category: String(form.get("category") || "Memory"),
      content: String(form.get("content") || "").trim(),
    };

    const { error } = await supabase.from("journal_entries").insert(payload);

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    formElement.reset();
    setMessage("Journal entry saved ✓");
    await loadData();
  }

  return (
    <AuthGuard>
      <AppShell>
        <div>
          <p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">
            Smart Journal
          </p>
          <h1 className="mt-1 text-3xl font-bold">Capture everyday moments.</h1>
          <p className="mt-2 text-[var(--muted)]">
            Memories saved here stay connected to your pet and your account.
          </p>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="card h-fit p-6">
            <h2 className="text-xl font-bold">New journal entry</h2>

            {pets.length === 0 && !loading ? (
              <p className="mt-4 rounded-2xl bg-[var(--cream)] p-4 text-sm">
                Add a pet first, then you can create journal entries.
              </p>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                  <label className="label">Pet</label>
                  <select name="pet_id" className="input" required defaultValue="">
                    <option value="" disabled>Select a pet</option>
                    {pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>{pet.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Title</label>
                  <input name="title" className="input" required maxLength={150} placeholder="A happy afternoon" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Date</label>
                    <input
                      name="entry_date"
                      className="input"
                      type="date"
                      required
                      defaultValue={new Date().toISOString().slice(0, 10)}
                    />
                  </div>

                  <div>
                    <label className="label">Category</label>
                    <select name="category" className="input" defaultValue="Memory">
                      <option>Memory</option>
                      <option>Milestone</option>
                      <option>Health</option>
                      <option>Adventure</option>
                      <option>Funny moment</option>
                      <option>Routine</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">What happened?</label>
                  <textarea
                    name="content"
                    className="input min-h-36"
                    required
                    maxLength={5000}
                    placeholder="Write a memory, observation or important moment..."
                  />
                </div>

                {message && (
                  <p className="rounded-2xl bg-[var(--cream)] p-3 text-sm">{message}</p>
                )}

                <button
                  disabled={saving || pets.length === 0}
                  type="submit"
                  className="btn btn-primary w-full"
                >
                  {saving ? "Saving…" : "Save journal entry"}
                </button>
              </form>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Your memories</h2>
              <span className="text-sm text-[var(--muted)]">{entries.length} entries</span>
            </div>

            {loading ? (
              <p className="mt-5 text-[var(--muted)]">Loading journal…</p>
            ) : entries.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-[var(--cream)] p-6">
                <div className="text-4xl">📖</div>
                <h3 className="mt-3 text-lg font-bold">Your journal starts here</h3>
                <p className="mt-2 text-[var(--muted)]">
                  Save the first memory and it will appear here permanently.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {entries.map((entry) => (
                  <article key={entry.id} className="rounded-2xl border border-[var(--line)] p-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                      <span className="rounded-full bg-[var(--mint)] px-3 py-1 font-bold text-[var(--green)]">
                        {entry.category}
                      </span>
                      <span>{entry.entry_date}</span>
                      <span>•</span>
                      <span>{getPetName(entry)}</span>
                    </div>
                    <h3 className="mt-3 text-xl font-bold">{entry.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap leading-7 text-[var(--muted)]">
                      {entry.content}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
