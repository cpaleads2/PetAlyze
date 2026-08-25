"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function StoryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    async function loadStory() {
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
        .eq("id", params.id)
        .single();

      if (error || !data) {
        router.replace("/stories");
        return;
      }

      setStory(data as unknown as Story);
      setLoading(false);
    }

    loadStory();
  }, [params.id, router]);

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);

    setTimeout(() => {
      setCopied("");
    }, 1500);
  }

  return (
    <AuthGuard>
      <AppShell>
        {loading || !story ? (
          <div className="card p-8 text-[var(--muted)]">
            Loading story...
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Link
                  href="/stories"
                  className="text-sm font-bold text-[var(--green)]"
                >
                  ← Story Library
                </Link>

                <p className="mt-6 text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">
                  AI Pet Story
                </p>

                <h1 className="mt-2 max-w-3xl text-4xl font-bold">
                  {story.title}
                </h1>

                <p className="mt-3 text-[var(--muted)]">
                  {story.pets?.name || "Your pet"}
                  {" · "}
                  {story.style}
                  {" · "}
                  {new Date(story.created_at).toLocaleDateString()}
                </p>
              </div>

              <button
                onClick={() => copyText(story.story, "story")}
                className="btn btn-secondary"
              >
                {copied === "story" ? "✓ Copied" : "Copy story"}
              </button>
            </div>

            <article className="card mt-6 p-8">
              <div className="whitespace-pre-line text-lg leading-9 text-[var(--muted)]">
                {story.story}
              </div>
            </article>

            {story.social_caption && (
              <section className="card mt-6 p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">
                      Social Caption
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      Ready to share
                    </h2>
                  </div>

                  <button
                    onClick={() =>
                      copyText(story.social_caption || "", "caption")
                    }
                    className="btn btn-primary"
                  >
                    {copied === "caption"
                      ? "✓ Copied"
                      : "Copy caption"}
                  </button>
                </div>

                <div className="mt-5 rounded-2xl bg-[var(--cream)] p-5">
                  <p className="leading-7">
                    {story.social_caption}
                  </p>
                </div>
              </section>
            )}
          </>
        )}
      </AppShell>
    </AuthGuard>
  );
}