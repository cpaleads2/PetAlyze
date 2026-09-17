"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/app-shell";
import AuthGuard from "@/components/auth-guard";
import { supabase } from "@/lib/supabase/client";

type Comic = {
  id: string;
  pet_id: string;
  title: string;
  source_text: string | null;
  tone: string;
  panel_count: number;
  status: string;
  source_media_id: string | null;
  pets: { name: string } | { name: string }[] | null;
};

type MediaItem = {
  id: string;
  storage_path: string;
  original_name: string | null;
  signedUrl?: string | null;
};

type Panel = {
  id: string;
  panel_number: number;
  scene_text: string | null;
  caption: string | null;
  dialogue: string | null;
  storage_path: string | null;
  regeneration_count: number;
  signedUrl?: string | null;
};

function petName(p: Comic["pets"]) {
  return Array.isArray(p) ? p[0]?.name || "Pet" : p?.name || "Pet";
}

export default function ComicPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [comic, setComic] = useState<Comic | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [savingSourcePhoto, setSavingSourcePhoto] = useState(false);
  const [buildingComic, setBuildingComic] = useState(false);
  const [exportTitle, setExportTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [credits, setCredits] = useState<number | null>(null);

  async function load() {
    setLoading(true);

    const [
      { data: comicData, error: comicError },
      { data: panelData, error: panelError },
      { data: creditAccount },
    ] = await Promise.all([
      supabase
        .from("ai_comics")
        .select("id,pet_id,title,source_text,tone,panel_count,status,source_media_id,pets(name)")
        .eq("id", params.id)
        .single(),

      supabase
        .from("ai_comic_panels")
        .select("id,panel_number,scene_text,caption,dialogue,storage_path,regeneration_count")
        .eq("comic_id", params.id)
        .order("panel_number"),

      supabase.from("user_credit_accounts").select("subscription_credits,purchased_credits").single(),
    ]);

    if (comicError || !comicData) {
      router.replace("/comics");
      return;
    }

    if (panelError) {
      setMessage(panelError.message);
    }

    const rows = (panelData || []) as Panel[];

    const withUrls = await Promise.all(
      rows.map(async (item) => {
        if (!item.storage_path) return { ...item, signedUrl: null };

        const { data } = await supabase.storage
          .from("ai-creations")
          .createSignedUrl(item.storage_path, 3600);

        return { ...item, signedUrl: data?.signedUrl || null };
      })
    );

    const { data: mediaRows } = await supabase
      .from("pet_media")
      .select("id,storage_path,original_name")
      .eq("pet_id", comicData.pet_id)
      .order("created_at", { ascending: false });

    const mediaWithUrls = await Promise.all(
      ((mediaRows || []) as MediaItem[]).map(async (item) => {
        const { data } = await supabase.storage
          .from("pet-media")
          .createSignedUrl(item.storage_path, 3600);
        return { ...item, signedUrl: data?.signedUrl || null };
      })
    );

    setComic(comicData as unknown as Comic);
    if (creditAccount) setCredits((creditAccount.subscription_credits || 0) + (creditAccount.purchased_credits || 0));
    setPanels(withUrls);
    setMedia(mediaWithUrls);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function generateScript() {
    setGeneratingScript(true);
    setMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setGeneratingScript(false);
      setMessage("Please log in again.");
      return;
    }

    const response = await fetch("/api/ai/comic-script", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ comic_id: params.id }),
    });

    const data = await response.json();
    setGeneratingScript(false);

    if (!response.ok) {
      setMessage(data.error || "Comic script generation failed.");
      return;
    }

    setMessage("4-panel comic script created and saved ✓");
    await load();
  }

  function panelCreditCost(panel: Panel) {
    if (!panel.storage_path) return 8;
    return (panel.regeneration_count || 0) === 0 ? 4 : 8;
  }

  async function generateImage(panel: Panel) {
    setGeneratingImage(panel.id);
    setMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setGeneratingImage(null);
      setMessage("Please log in again.");
      return;
    }

    const response = await fetch("/api/ai/comic-panel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ panel_id: panel.id }),
    });

    const data = await response.json();
    setGeneratingImage(null);

    if (!response.ok) {
      console.error("[v0.9.1.1] comic-panel failed", {
        status: response.status,
        response: data,
      });
      const detail =
        typeof data?.error === "string" ? data.error : JSON.stringify(data || {});
      setMessage(`Generation failed (${response.status}): ${detail}`);
      return;
    }

    // v0.9.2.1: generation and persistence succeeded.
    // Reload automatically using a cache-busted URL so the newly stored panel is shown.
    const refreshedUrl = new URL(window.location.href);
    refreshedUrl.searchParams.set("_panel_refresh", Date.now().toString());
    window.location.replace(refreshedUrl.toString());
    return;

  }

  async function downloadFinalComic() {
    if (!comic || panels.length !== 4) return;
    const ordered = [1, 2, 3, 4]
      .map((n) => panels.find((p) => p.panel_number === n))
      .filter(Boolean) as Panel[];

    if (ordered.length !== 4 || ordered.some((p) => !p.signedUrl)) {
      setMessage("Generate all 4 panel images before downloading the final comic.");
      return;
    }

    setBuildingComic(true);
    setMessage("");

    try {
      const loadImage = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("Could not load a comic panel."));
          image.src = src;
        });

      const images = await Promise.all(
        ordered.map((panel) => loadImage(panel.signedUrl as string))
      );

      const canvas = document.createElement("canvas");
      const width = 1800, margin = 80, gap = 44, header = 190, footer = 90;
      const cardW = (width - margin * 2 - gap) / 2;
      const imageH = cardW;
      const textH = 150;
      const cardH = imageH + textH;
      canvas.width = width;
      canvas.height = header + cardH * 2 + gap + footer;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available.");

      ctx.fillStyle = "#f7f3e8";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = "center";
      ctx.fillStyle = "#173f35";
      ctx.font = "700 66px Arial, sans-serif";
      ctx.fillText(exportTitle.trim() || comic.title || "PetAlyze Comic", width / 2, 82);
      ctx.fillStyle = "#617b72";
      ctx.font = "28px Arial, sans-serif";
      ctx.fillText("A PetAlyze Comic", width / 2, 132);

      const wrap = (text: string, x: number, y: number, max: number, lh: number, maxLines = 2) => {
        const words = text.split(/\s+/);
        const lines: string[] = [];
        let line = "";
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (ctx.measureText(test).width > max && line) {
            lines.push(line);
            line = word;
            if (lines.length >= maxLines - 1) break;
          } else line = test;
        }
        if (line && lines.length < maxLines) lines.push(line);
        lines.forEach((v, i) => ctx.fillText(v, x, y + i * lh));
      };

      ordered.forEach((panel, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = margin + col * (cardW + gap);
        const y = header + row * (cardH + gap);

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 28);
        ctx.fill();

        const img = images[i];
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x + 18, y + 18, cardW - 36, imageH - 20, 22);
        ctx.clip();
        ctx.drawImage(img, sx, sy, side, side, x + 18, y + 18, cardW - 36, imageH - 20);
        ctx.restore();

        ctx.textAlign = "left";
        ctx.fillStyle = "#16856d";
        ctx.font = "700 23px Arial, sans-serif";
        ctx.fillText(`PANEL ${panel.panel_number}`, x + 34, y + imageH + 32);

        ctx.fillStyle = "#173f35";
        ctx.font = "600 27px Arial, sans-serif";
        wrap(panel.caption || panel.scene_text || "", x + 34, y + imageH + 70, cardW - 68, 34);

        if (panel.dialogue) {
          ctx.fillStyle = "#61716b";
          ctx.font = "italic 24px Arial, sans-serif";
          wrap(`“${panel.dialogue}”`, x + 34, y + imageH + 118, cardW - 68, 31);
        }
      });

      ctx.textAlign = "center";
      ctx.fillStyle = "#789087";
      ctx.font = "23px Arial, sans-serif";
      ctx.fillText("Created with PetAlyze", width / 2, canvas.height - 35);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 1));
      if (!blob) throw new Error("Could not build final comic PNG.");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safe = (exportTitle.trim() || comic.title || "petalyze-comic").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      a.href = url;
      a.download = `${safe || "petalyze-comic"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage("Final 4-panel comic downloaded ✓");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not build final comic.");
    } finally {
      setBuildingComic(false);
    }
  }

  async function chooseSourcePhoto(mediaId: string) {
    if (!comic) return;
    setSavingSourcePhoto(true);
    setMessage("");

    const { error } = await supabase
      .from("ai_comics")
      .update({ source_media_id: mediaId, updated_at: new Date().toISOString() })
      .eq("id", comic.id);

    setSavingSourcePhoto(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setComic({ ...comic, source_media_id: mediaId });
    setMessage("Comic source photo saved ✓");
  }

  async function downloadPanel(panel: Panel) {
    if (!panel.signedUrl) return;

    setMessage("");
    try {
      const response = await fetch(panel.signedUrl);
      if (!response.ok) throw new Error(`Download failed (${response.status}).`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `petalyze-comic-${comic?.title || "comic"}-panel-${panel.panel_number}.png`
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .toLowerCase();
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Download failed.");
    }
  }

  const scriptReady = panels.length === 4;

  return (
    <AuthGuard>
      <AppShell>
        {loading || !comic ? (
          <div className="card p-8">Loading…</div>
        ) : (
          <>
            <Link href="/comics" className="font-bold text-[var(--green)]">
              ← Comic Library
            </Link>

            <div className="card mt-5 p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">
                    Comic Project · {comic.status.replaceAll("_", " ")}
                  </p>

                  <h1 className="mt-2 text-3xl font-bold">{comic.title}</h1>

                  <p className="mt-2 text-[var(--muted)]">
                    {petName(comic.pets)} · {comic.tone} · {comic.panel_count} panels
                  </p>
                </div>

                <button
                  type="button"
                  onClick={generateScript}
                  disabled={generatingScript || generatingImage !== null}
                  className="btn btn-primary"
                >
                  {generatingScript
                    ? "Writing 4 panels…"
                    : scriptReady
                      ? "🔄 Regenerate script"
                      : "✨ Generate 4-panel script"}
                </button>
              </div>

              <div className="mt-5 rounded-2xl bg-[var(--mint)] p-4 text-sm text-[var(--green)]">
                <b>AI Comic Credits.</b> New panel: 8 credits · first regenerate: 4 credits · second+ regenerate: 8 credits.
                A new 4-panel comic costs 32 credits total. Visual Bible and Dynamic Pose remain active.
              </div>
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
                <span className="font-bold">AI Credits</span>
                <span className="font-bold text-[var(--green)]">{credits === null ? "…" : `${credits} available`}</span>
              </div>
            </div>

            <div className="card mt-5 p-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Choose source photo</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Select the identity anchor for {petName(comic.pets)}. This same photo will guide every comic panel.
                  </p>
                </div>
                <Link href="/media" className="text-sm font-bold text-[var(--green)]">
                  Open Media Library →
                </Link>
              </div>

              {media.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-[var(--cream)] p-4 text-[var(--muted)]">
                  No photos found for this pet. Add photos in Media Library first.
                </p>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {media.map((item) => {
                    const selected = comic.source_media_id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={savingSourcePhoto}
                        onClick={() => chooseSourcePhoto(item.id)}
                        className={`overflow-hidden rounded-2xl border-2 text-left ${
                          selected ? "border-[var(--green)]" : "border-[var(--line)]"
                        }`}
                      >
                        <div className="aspect-square bg-[var(--cream)]">
                          {item.signedUrl ? (
                            <img
                              src={item.signedUrl}
                              alt={item.original_name || "Pet photo"}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="p-2 text-xs font-bold">
                          {selected ? "✓ Selected" : "Select"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {message && (
              <p className="mt-5 rounded-2xl bg-[var(--cream)] p-4">
                {message}
              </p>
            )}

            {panels.length === 4 && panels.every((panel) => panel.signedUrl) && (
              <section className="mt-6 rounded-3xl border border-[var(--line)] bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--green)]">
                      Final Comic
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">Your 4-panel comic is ready</h2>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Download all four panels as one shareable 2×2 PNG with title, captions and dialogue.
                    </p>
                    <label className="mt-4 block text-xs font-bold uppercase tracking-[.12em] text-[var(--muted)]">
                      Export title
                    </label>
                    <input
                      value={exportTitle}
                      onChange={(e) => setExportTitle(e.target.value)}
                      placeholder={comic.title || "PetAlyze Comic"}
                      className="mt-2 w-full max-w-xl rounded-2xl border border-[var(--line)] bg-[var(--cream)] px-4 py-3 text-sm outline-none"
                    />
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Optional — changes only the downloaded PNG title, not the saved comic.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadFinalComic}
                    disabled={buildingComic}
                    className="btn btn-primary"
                  >
                    {buildingComic ? "Building comic…" : "⬇ Download Comic PNG"}
                  </button>
                </div>
              </section>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((n) => {
                const panel = panels.find(
                  (item) => item.panel_number === n
                );

                return (
                  <div className="card p-5" key={n}>
                    <div className="aspect-square overflow-hidden rounded-2xl bg-[var(--cream)]">
                      {panel?.signedUrl ? (
                        <img
                          key={panel.signedUrl}
                          src={panel.signedUrl}
                          alt={`Comic panel ${n}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-5xl">
                          💬
                        </div>
                      )}
                    </div>

                    <p className="mt-4 text-xs font-bold uppercase tracking-[.14em] text-[var(--green)]">
                      Panel {n}
                    </p>

                    {panel ? (
                      <>
                        <h3 className="mt-3 text-sm font-bold uppercase text-[var(--muted)]">
                          Scene
                        </h3>

                        <p className="mt-1 leading-6">{panel.scene_text}</p>

                        {panel.caption && (
                          <p className="mt-3 rounded-xl bg-[var(--cream)] p-3">
                            {panel.caption}
                          </p>
                        )}

                        {panel.dialogue && (
                          <p className="mt-3 rounded-xl border border-[var(--line)] p-3">
                            “{panel.dialogue}”
                          </p>
                        )}

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => generateImage(panel)}
                            disabled={generatingImage === panel.id || (credits !== null && credits < panelCreditCost(panel))}
                            className="btn btn-primary w-full"
                          >
                            {generatingImage === panel.id
                              ? "Generating image…"
                              : credits !== null && credits < panelCreditCost(panel)
                                ? "Not enough credits"
                                : panel.storage_path
                                  ? `🎨 Regenerate image · ${panelCreditCost(panel)} credits`
                                  : "🎨 Generate image · 8 credits"}
                          </button>

                          {panel.signedUrl && (
                            <button
                              type="button"
                              onClick={() => downloadPanel(panel)}
                              className="btn w-full"
                            >
                              ⬇ Download PNG
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 text-[var(--muted)]">
                        Generate the comic script first.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </AppShell>
    </AuthGuard>
  );
}
