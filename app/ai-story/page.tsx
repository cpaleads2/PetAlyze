"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/app-shell";
import AuthGuard from "@/components/auth-guard";
import { supabase } from "@/lib/supabase/client";

type Pet = { id: string; name: string };

type Story = {
  id: string;
  title: string;
  story: string;
  social_caption: string | null;
  created_at: string;
};

export default function AIStoryPage() {
  const searchParams = useSearchParams();
  const presetPetId = searchParams.get("pet_id") || "";
  const presetMemory = searchParams.get("memory") || "";

  const [pets, setPets] = useState<Pet[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);

    const [{ data: petData }, { data: storyData }] = await Promise.all([
      supabase
        .from("pets")
        .select("id,name")
        .order("created_at", { ascending: true }),

      supabase
        .from("ai_stories")
        .select("id,title,story,social_caption,created_at")
        .order("created_at", { ascending: false }),
    ]);

    setPets(petData || []);
    setStories(storyData || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    setGenerating(true);
    setMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setGenerating(false);
      setMessage("Please log in again.");
      return;
    }

    const res = await fetch("/api/ai/story", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        pet_id: String(form.get("pet_id") || ""),
        style: String(form.get("style") || "Heartwarming"),
        language: String(form.get("language") || "Auto"),
        memory: String(form.get("memory") || "").trim(),
      }),
    });

    const data = await res.json();
    setGenerating(false);

    if (!res.ok) {
      setMessage(data.error || "Generation failed.");
      return;
    }

    setMessage("AI story created and saved ✓");
    await load();
  }

  const latest = stories[0];

  return (
    <AuthGuard>
      <AppShell>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">
              AI Memory Studio
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Turn a real memory into a story.
            </h1>

            <p className="mt-2 text-[var(--muted)]">
              Free MVP plan: one successful AI story per calendar month.
            </p>
          </div>

          <Link href="/stories" className="btn btn-secondary">
            📚 Open Story Library
          </Link>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="card h-fit p-6">
            <h2 className="text-xl font-bold">Create AI story</h2>

            {pets.length === 0 && !loading ? (
              <p className="mt-4 rounded-2xl bg-[var(--cream)] p-4 text-sm">
                Add a pet before generating a story.
              </p>
            ) : (
              <form
                key={`${presetPetId}-${presetMemory}`}
                onSubmit={submit}
                className="mt-5 space-y-4"
              >
                <div>
                  <label className="label">Pet</label>

                  <select
                    name="pet_id"
                    className="input"
                    required
                    defaultValue={presetPetId}
                  >
                    <option value="" disabled>
                      Select a pet
                    </option>

                    {pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Story style</label>

                  <select
                    name="style"
                    className="input"
                    defaultValue="Heartwarming"
                  >
                    <option>Heartwarming</option>
                    <option>Funny</option>
                    <option>Adventure</option>
                    <option>Poetic</option>
                    <option>Social post</option>
                  </select>
                </div>

                <div>
                  <label className="label">Language</label>

                  <select
                    name="language"
                    className="input"
                    defaultValue="Auto"
                  >
                    <option>Auto</option>
                    <option>English</option>
                    <option>Ukrainian</option>
                    <option>Russian</option>
                    <option>Spanish</option>
                    <option>German</option>
                    <option>French</option>
                  </select>
                </div>

                <div>
                  <label className="label">Memory or moment</label>

                  <textarea
                    name="memory"
                    className="input min-h-40"
                    required
                    maxLength={5000}
                    defaultValue={presetMemory}
                    placeholder="Describe a real moment with your pet..."
                  />
                </div>

                {presetMemory && (
                  <p className="rounded-2xl bg-[var(--mint)] p-3 text-sm text-[var(--green)]">
                    Memory imported from Smart Journal ✓
                  </p>
                )}

                {message && (
                  <p className="rounded-2xl bg-[var(--cream)] p-3 text-sm">
                    {message}
                  </p>
                )}

                <button
                  disabled={generating || pets.length === 0}
                  type="submit"
                  className="btn btn-primary w-full"
                >
                  {generating ? "Creating with AI…" : "✨ Generate & save"}
                </button>
              </form>
            )}
          </div>

          <div className="card p-7">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Latest story</h2>
              <span className="text-sm text-[var(--muted)]">
                {stories.length} saved
              </span>
            </div>

            {loading ? (
              <p className="mt-5 text-[var(--muted)]">Loading stories…</p>
            ) : !latest ? (
              <div className="mt-5 rounded-2xl bg-[var(--cream)] p-6">
                <div className="text-4xl">✨</div>
                <h3 className="mt-3 text-lg font-bold">
                  Your first AI story will appear here
                </h3>
                <p className="mt-2 text-[var(--muted)]">
                  Choose a pet, describe a real moment and PetAlyze will turn it into a polished story.
                </p>
              </div>
            ) : (
              <article className="mt-5">
                <h3 className="text-3xl font-bold">{latest.title}</h3>

                <p className="mt-5 whitespace-pre-wrap leading-8 text-[var(--muted)]">
                  {latest.story}
                </p>

                {latest.social_caption && (
                  <div className="mt-6 rounded-2xl bg-[var(--cream)] p-5">
                    <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--green)]">
                      Social caption
                    </p>

                    <p className="mt-2 leading-7">
                      {latest.social_caption}
                    </p>
                  </div>
                )}

                <Link
                  href={`/stories/${latest.id}`}
                  className="mt-6 inline-block font-bold text-[var(--green)]"
                >
                  Open full story →
                </Link>
              </article>
            )}
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
