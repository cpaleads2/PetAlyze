"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/app-shell";
import AuthGuard from "@/components/auth-guard";
import { supabase } from "@/lib/supabase/client";

type Story = {
  id: string;
  title: string;
  story: string;
  social_caption: string | null;
  style: string;
  language: string | null;
  created_at: string;
  pets: {
    name: string;
    species: string | null;
  } | null;
};

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadStories() {
      setLoading(true);

      const { data, error } = await supabase
        .from("ai_stories")
        .select(`
          id,
          title,
          story,
          social_caption,
          style,
          language,
          created_at,
          pets (
            name,
            species
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(error.message);
        setStories([]);
      } else {
        setStories((data || []) as unknown as Story[]);
      }

      setLoading(false);
    }

    loadStories();
  }, []);

  return (
    <AuthGuard>
      <AppShell>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">
              AI Story Library
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Your pet stories
            </h1>

            <p className="mt-2 text-[var(--muted)]">
              Every AI memory you create with PetAlyze stays here.
            </p>
          </div>

          <Link href="/ai-story" className="btn btn-primary">
            ✨ Create AI story
          </Link>
        </div>

        {loading && (
          <div className="card mt-6 p-6">
            Loading your stories...
          </div>
        )}

        {message && (
          <div className="card mt-6 p-6">
            <p>{message}</p>
          </div>
        )}

        {!loading && !message && stories.length === 0 && (
          <div className="card mt-6 p-8">
            <div className="text-4xl">📚</div>

            <h2 className="mt-4 text-2xl font-bold">
              Your story library is waiting
            </h2>

            <p className="mt-2 max-w-xl text-[var(--muted)]">
              Turn a real moment with your pet into your first
              AI-generated memory.
            </p>

            <Link
              href="/ai-story"
              className="btn btn-primary mt-6 inline-flex"
            >
              ✨ Create your first story
            </Link>
          </div>
        )}

        {!loading && stories.length > 0 && (
          <>
            <div className="mt-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Saved stories
              </h2>

              <span className="text-sm text-[var(--muted)]">
                {stories.length} {stories.length === 1 ? "story" : "stories"}
              </span>
            </div>

            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              {stories.map((item) => (
                <article key={item.id} className="card p-6">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-[var(--cream)] px-3 py-1">
                      ✨ {item.style}
                    </span>

                    {item.language && (
                      <span className="rounded-full bg-[var(--cream)] px-3 py-1">
                        {item.language}
                      </span>
                    )}
                  </div>

                  <p className="mt-5 text-sm text-[var(--muted)]">
                    {item.pets?.name || "Your pet"}
                    {" · "}
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    {item.title}
                  </h2>

                  <p className="mt-4 line-clamp-5 whitespace-pre-line leading-7 text-[var(--muted)]">
                    {item.story}
                  </p>

                  <div className="mt-6 border-t border-[var(--line)] pt-5">
                    <Link
                      href={`/stories/${item.id}`}
                      className="font-bold"
                    >
                      Read story →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </AppShell>
    </AuthGuard>
  );
}
