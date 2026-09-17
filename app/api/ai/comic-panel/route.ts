import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const runtime = "nodejs";
const ROUTE_VERSION = "v0.10.0e1";

export async function POST(req: NextRequest) {
  let diagnosticStage = "route_start";
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return NextResponse.json({ error: `[${ROUTE_VERSION}] Unauthorized` }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const openai = process.env.OPENAI_API_KEY;

    if (!url || !key || !openai) {
      return NextResponse.json({ error: `[${ROUTE_VERSION}] Server environment variables are missing.` }, { status: 500 });
    }

    const sb = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await sb.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: `[${ROUTE_VERSION}] Invalid session.` }, { status: 401 });
    }

    const body = await req.json();
    const panelId = String(body.panel_id || "");
    if (!panelId) {
      return NextResponse.json({ error: `[${ROUTE_VERSION}] panel_id is required.` }, { status: 400 });
    }

    const { data: panel, error: panelError } = await sb
      .from("ai_comic_panels")
      .select("id,comic_id,panel_number,scene_text,caption,dialogue,storage_path,regeneration_count")
      .eq("id", panelId)
      .single();

    if (panelError || !panel) {
      return NextResponse.json({ error: `[${ROUTE_VERSION}] Comic panel not found.` }, { status: 404 });
    }

    const { data: comic, error: comicError } = await sb
      .from("ai_comics")
      .select("id,pet_id,title,tone,source_media_id,pets(name,species,breed)")
      .eq("id", panel.comic_id)
      .single();

    if (comicError || !comic) {
      return NextResponse.json({ error: `[${ROUTE_VERSION}] Comic project not found.` }, { status: 404 });
    }

    const { data: refs, error: refsError } = await sb
      .from("pet_media")
      .select("id,storage_path,original_name,identity_role,created_at")
      .eq("pet_id", comic.pet_id)
      .not("identity_role", "is", null);

    if (refsError) {
      return NextResponse.json({ error: `[${ROUTE_VERSION}] ${refsError.message}` }, { status: 500 });
    }
    let selectedSourceMedia: {
      id: string;
      storage_path: string;
      original_name: string | null;
      identity_role: string | null;
      created_at: string | null;
    } | null = null;

    if (comic.source_media_id) {
      const { data: sourceMedia } = await sb
        .from("pet_media")
        .select("id,storage_path,original_name,identity_role,created_at")
        .eq("id", comic.source_media_id)
        .eq("pet_id", comic.pet_id)
        .maybeSingle();

      selectedSourceMedia = sourceMedia || null;
    }

    if (!selectedSourceMedia && !refs?.length) {
      return NextResponse.json(
        { error: `[${ROUTE_VERSION}] Choose a source photo from Media Library or add a photo to the Pet Identity Set first.` },
        { status: 400 }
      );
    }

    // Pipeline test: send EXACTLY ONE identity image to OpenAI.
    // Prefer Primary, then Face, Side, Full body, Reference.
    const priority: Record<string, number> = {
      primary: 0,
      face: 1,
      side: 2,
      full_body: 3,
      reference: 4,
    };

    const identityFallback = [...(refs || [])].sort((a, b) => {
      const pa = priority[a.identity_role || "reference"] ?? 9;
      const pb = priority[b.identity_role || "reference"] ?? 9;
      if (pa !== pb) return pa - pb;
      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    })[0];

    const selectedRef = selectedSourceMedia || identityFallback;

    if (!selectedRef) {
      return NextResponse.json(
        { error: `[${ROUTE_VERSION}] No usable source photo found.` },
        { status: 400 }
      );
    }

    const { data: signed, error: signedError } = await sb.storage
      .from("pet-media")
      .createSignedUrl(selectedRef.storage_path, 300);

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json(
        { error: `[${ROUTE_VERSION}] Could not create signed URL: ${signedError?.message || "unknown error"}` },
        { status: 500 }
      );
    }

    const imageResponse = await fetch(signed.signedUrl);
    if (!imageResponse.ok) {
      const diagnosticBody = await imageResponse.clone().text();
      console.error(`[${ROUTE_VERSION}] OpenAI image edit rejected`, {
        status: imageResponse.status,
        body: diagnosticBody,
      });
      return NextResponse.json(
        { error: `[${ROUTE_VERSION}] Could not fetch identity reference (${imageResponse.status}).` },
        { status: 500 }
      );
    }

    const blob = await imageResponse.blob();
    const type = blob.type || "image/jpeg";
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";

    const pet = Array.isArray(comic.pets) ? comic.pets[0] : comic.pets;

    // v0.9.1.0 Comic Visual Bible
    // Panel 1: the selected real pet photo remains the single reference.
    // Panels 2+: build ONE composite PNG containing:
    //   left  = selected real pet photo (identity)
    //   right = generated Panel 1 (comic world / bird / style)
    // GPT-Image-2 still receives exactly ONE multipart image field.
    let referenceBlob = blob;
    let referenceExt = ext;
    let referenceMode = selectedSourceMedia ? "selected_library_photo_identity_lock" : "pet_identity";
    let visualBiblePanelNumber: number | null = null;

    if (panel.panel_number > 1) {
      console.log(`[${ROUTE_VERSION}] building Visual Bible for panel ${panel.panel_number}`);
      const { data: biblePanel } = await sb
        .from("ai_comic_panels")
        .select("panel_number,storage_path")
        .eq("comic_id", panel.comic_id)
        .eq("panel_number", 1)
        .maybeSingle();

      console.log(`[${ROUTE_VERSION}] Panel 1 lookup`, {
        found: Boolean(biblePanel),
        storage_path: biblePanel?.storage_path || null,
      });
      if (biblePanel?.storage_path) {
        const { data: bibleSigned, error: bibleSignedError } = await sb.storage
          .from("ai-creations")
          .createSignedUrl(biblePanel.storage_path, 300);

        if (!bibleSignedError && bibleSigned?.signedUrl) {
          const bibleResponse = await fetch(bibleSigned.signedUrl);

          console.log(`[${ROUTE_VERSION}] Panel 1 download`, {
            ok: bibleResponse.ok,
            status: bibleResponse.status,
          });
          if (bibleResponse.ok) {
            const identityBuffer = Buffer.from(await blob.arrayBuffer());
            const bibleBuffer = Buffer.from(await bibleResponse.arrayBuffer());

            const identityTile = await sharp(identityBuffer)
              .rotate()
              .resize(768, 768, { fit: "contain", background: { r: 248, g: 246, b: 238, alpha: 1 } })
              .png()
              .toBuffer();

            const bibleTile = await sharp(bibleBuffer)
              .rotate()
              .resize(768, 768, { fit: "contain", background: { r: 248, g: 246, b: 238, alpha: 1 } })
              .png()
              .toBuffer();

            const labelSvg = Buffer.from(`
              <svg width="1536" height="850" xmlns="http://www.w3.org/2000/svg">
                <rect width="1536" height="850" fill="#f8f6ee"/>
                <text x="384" y="815" text-anchor="middle"
                  font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#173b2b">
                  PET IDENTITY — KEEP THIS EXACT PET
                </text>
                <text x="1152" y="815" text-anchor="middle"
                  font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#173b2b">
                  COMIC WORLD — KEEP BIRD + STYLE
                </text>
              </svg>
            `);

            const compositeBuffer = await sharp(labelSvg)
              .composite([
                { input: identityTile, left: 0, top: 0 },
                { input: bibleTile, left: 768, top: 0 },
              ])
              .png()
              .toBuffer();

            console.log(`[${ROUTE_VERSION}] Visual Bible composite created`, {
              bytes: compositeBuffer.length,
            });
            referenceBlob = new Blob([compositeBuffer], { type: "image/png" });
            referenceExt = "png";
            referenceMode = "comic_visual_bible";
            visualBiblePanelNumber = 1;
          }
        }
      }
    }

    const prompt = `Create Panel ${panel.panel_number} of the SAME premium four-panel pet comic.

AUTHORITATIVE PET FACTS:
Name: ${pet?.name || "Pet"}
Species: ${pet?.species || "unknown"}
Breed: ${pet?.breed || "unknown"}

VISUAL REFERENCE MODE: ${referenceMode}
${referenceMode === "comic_visual_bible"
  ? `The supplied image is a two-part COMIC VISUAL BIBLE. LEFT side is labeled PET IDENTITY and is authoritative for WHO the pet is. RIGHT side is labeled COMIC WORLD and is Panel 1, authoritative for the recurring bird, forest environment, palette, rendering style, and comic-world design. Do not merge the two halves into the output composition; use them only as separate visual references.`
  : `The supplied image is the pet identity reference selected for this comic.`}

IDENTITY LOCK:
${referenceMode === "comic_visual_bible"
  ? "Use the LEFT PET IDENTITY half"
  : "Use the supplied pet image"} as the authoritative identity anchor for THIS PANEL and the entire comic.
Keep the same individual pet: face shape, ears, muzzle, coat color/pattern, fur character,
body proportions, and other visible identifying traits.
Do not redesign the pet into a generic example of its species or breed.
The source image controls WHO the pet is. The scene below controls WHAT the pet is doing.
Do not copy the source photo's pose, camera angle, or background unless the scene requires it.

AUTHORITATIVE CURRENT PANEL ACTION:
${panel.scene_text || ""}

COMIC VISUAL CONTINUITY LOCK:
${referenceMode === "comic_visual_bible"
  ? `The RIGHT COMIC WORLD half visually overrides generic text descriptions for the recurring bird, forest, palette, lighting, and illustration treatment. Reproduce the SAME bird design from that reference whenever the bird appears, while changing only its pose/position as required by the current action.`
  : `Panel 1 establishes the recurring comic-world design.`}
These recurring visual elements must keep the SAME design in every panel where they appear:
- Pet: the exact same individual defined by the supplied identity anchor.
- Bird: one small wild forest bird; warm brown-gray body, lighter beige chest, darker brown wings and tail,
  small pointed beak, natural proportions. It is the SAME bird throughout the chase.
- Forest trail: one narrow earthy woodland path bordered by green grass and leafy vegetation,
  with warm natural daylight filtering through trees.
- Stick/branch: when the story reaches the tripping beat, show one ordinary fallen brown woodland stick
  lying across the same trail; do not turn it into a log, toy, rope, or other obstacle.
- Art direction: the same polished storybook-comic illustration treatment, character rendering,
  natural warm palette, believable anatomy, and cinematic motion language.

Continuity is mandatory for IDENTITY AND DESIGN, but NOT for pose.

DYNAMIC POSE CONTINUITY:
- A recurring character must remain the same character while its pose changes naturally from panel to panel.
- NEVER copy the bird's exact pose, wing position, body angle, screen position, scale, or flight phase from Panel 1.
- Panel 1 is a DESIGN reference for the bird, not a POSE reference.
- Give the bird a new, action-appropriate flight phase in every later panel.
- Panel 2: show active forward flight/chase progression with a visibly different wing phase from Panel 1.
- Panel 3: the bird is farther ahead; use another distinct wing phase, distance, and/or angle while keeping the same bird design.
- Panel 4: show the same bird clearly flying away/upward from the fallen pet, again with a distinct pose.
- Likewise, the pet identity reference controls appearance only. Never copy the source photo's pose.
- Current panel scene_text is authoritative for body pose, motion, direction, camera relationship, and action.

Do not redesign recurring characters or objects from panel to panel.
If a recurring element is not required by the current scene, do not force it into frame merely to show continuity.
The bird's colors, proportions, and recognizable design must remain stable while its pose and flight phase change.

STORY CONTINUITY:
Comic title: ${comic.title}
Comic tone: ${comic.tone}
Panel number: ${panel.panel_number} of 4.
This image must feel like one panel in the same continuous story.
Use a consistent polished storybook-comic visual language across panels.
For this comic's forest sequence, keep the environment, palette, lighting, and rendering treatment
stable unless the current scene explicitly requires a change.
Keep recurring subjects and objects visually consistent.
Do not invent a new location, season, costume, breed, coat pattern, obstacle, or story event.

ACTION-FIDELITY RULES:
- Depict the exact CURRENT PANEL ACTION at its active moment, not a passive before/after pose.
- Body posture, movement, limbs, gaze, expression, and spatial relationships must clearly communicate the action.
- Important subjects and objects named in the scene must be visibly present.
- Preserve chronology and cause/effect.
- Running, chasing, tripping, falling, or landing must show unmistakable motion and momentum.
- Do not simplify an active scene into a portrait.
- Do not invent a different action, obstacle, outcome, or story beat.
- If scene wording conflicts with authoritative pet identity facts, ignore only the identity conflict; preserve the action.

STYLE:
Polished storybook-comic illustration, believable anatomy, clean readable composition,
consistent character design and visual treatment.
Do not render text, speech bubbles, captions, logos, watermarks, or panel numbers inside the image.`;

    // v0.10.0e1 persistent regenerate pricing.
    // New = 8. First regenerate = 4. Second+ regenerate = 8.
    const isRegenerate = Boolean(panel.storage_path);
    const regenerationCount = panel.regeneration_count || 0;
    const creditCost = !isRegenerate ? 8 : regenerationCount === 0 ? 4 : 8;
    const creditMode = !isRegenerate ? "generate" : regenerationCount === 0 ? "regenerate_first" : "regenerate_repeat";
    const chargeKey = `comic-panel:${panel.id}:${crypto.randomUUID()}`;
    const { data: charge, error: chargeError } = await sb.rpc("petalyze_charge_credits", {
      p_amount: creditCost,
      p_operation_key: chargeKey,
      p_reference_type: "ai_comic_panel",
      p_reference_id: panel.id,
      p_metadata: { comic_id: comic.id, panel_number: panel.panel_number, mode: creditMode, regeneration_count_before: regenerationCount },
    });
    if (chargeError) return NextResponse.json({ error: `[${ROUTE_VERSION}] ${chargeError.message}` }, { status: 500 });
    const chargeRow = Array.isArray(charge) ? charge[0] : charge;
    if (!chargeRow?.success) return NextResponse.json({ error: `[${ROUTE_VERSION}] Not enough AI credits. This panel requires ${creditCost} credits.` }, { status: 402 });

    let creditFinal = false;
    const refundCredits = async (reason: string) => {
      if (creditFinal) return;
      await sb.rpc("petalyze_refund_credits", {
        p_charge_operation_key: chargeKey,
        p_refund_operation_key: `refund:${chargeKey}`,
        p_metadata: { reason, comic_id: comic.id, panel_id: panel.id, route_version: ROUTE_VERSION },
      });
      creditFinal = true;
    };

    const form = new FormData();
    form.append("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-2");
    form.append("image", referenceBlob, `reference.${referenceExt}`); // EXACTLY ONE image
    form.append("prompt", prompt);
    form.append("size", "1024x1024");
    form.append("quality", "low");

    diagnosticStage = "before_openai_fetch";
    console.log(`[${ROUTE_VERSION}] OpenAI image request starting`, {
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      referenceMode,
      imageParts: 1,
    });

    let result: Response;
    try {
      result = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${openai}` },
        body: form,
      });
    } catch (error) {
      await refundCredits("openai_request_failed");
      throw error;
    }

    diagnosticStage = "openai_response_received";
    const rawOpenAI = await result.text();
    console.log(`[${ROUTE_VERSION}] OpenAI response`, {
      status: result.status,
      ok: result.ok,
    });

    let json: any;
    try {
      json = JSON.parse(rawOpenAI);
    } catch {
      await refundCredits("openai_non_json_response");
      return NextResponse.json(
        {
          error: `[${ROUTE_VERSION}] OpenAI returned non-JSON response.`,
          route_version: ROUTE_VERSION,
          diagnostic_stage: diagnosticStage,
          openai_status: result.status,
          openai_body_preview: rawOpenAI.slice(0, 1200),
        },
        { status: 502 }
      );
    }

    if (!result.ok) {
      await refundCredits("openai_generation_failed");
      return NextResponse.json(
        {
          error: `[${ROUTE_VERSION}] ${json?.error?.message || `OpenAI image generation failed (${result.status}).`}`,
          route_version: ROUTE_VERSION,
          diagnostic_stage: diagnosticStage,
          openai_status: result.status,
          openai_error: json?.error || null,
        },
        { status: result.status }
      );
    }

    diagnosticStage = "extract_image_payload";
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) {
      await refundCredits("openai_no_image_data");
      return NextResponse.json({ error: `[${ROUTE_VERSION}] OpenAI returned no image data.` }, { status: 502 });
    }

    diagnosticStage = "image_payload_ok";
    console.log(`[${ROUTE_VERSION}] OpenAI image payload received`, { base64Chars: b64.length });

    const path = `${userData.user.id}/${comic.id}/panel-${panel.panel_number}-${crypto.randomUUID()}.png`;

    diagnosticStage = "storage_upload";
    const { error: uploadError } = await sb.storage
      .from("ai-creations")
      .upload(path, Buffer.from(b64, "base64"), {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      await refundCredits("storage_upload_failed");
      return NextResponse.json({ error: `[${ROUTE_VERSION}] ${uploadError.message}` }, { status: 500 });
    }

    const oldPath = panel.storage_path;

    diagnosticStage = "database_update";
    const { error: saveError } = await sb
      .from("ai_comic_panels")
      .update({
        storage_path: path,
        mime_type: "image/png",
        regeneration_count: isRegenerate ? regenerationCount + 1 : regenerationCount,
      })
      .eq("id", panel.id);

    if (saveError) {
      await sb.storage.from("ai-creations").remove([path]);
      await refundCredits("panel_save_failed");
      return NextResponse.json({ error: `[${ROUTE_VERSION}] ${saveError.message}` }, { status: 500 });
    }

    if (oldPath && oldPath !== path) {
      await sb.storage.from("ai-creations").remove([oldPath]);
    }
    creditFinal = true;

    diagnosticStage = "signed_url";
    const { data: signedResult, error: resultUrlError } = await sb.storage
      .from("ai-creations")
      .createSignedUrl(path, 3600);

    if (resultUrlError || !signedResult?.signedUrl) {
      return NextResponse.json(
        { error: `[${ROUTE_VERSION}] ${resultUrlError?.message || "Could not create result URL."}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      route_version: ROUTE_VERSION,
      generation_trace: {
        generation_id: `${panel.id.slice(0, 8)}-${Date.now().toString(36)}`,
        generated_at: new Date().toISOString(),
        storage_path: path,
        reference_mode: referenceMode,
        visual_bible: referenceMode === "comic_visual_bible",
      },
      panel_id: panel.id,
      storage_path: path,
      signed_url: signedResult.signedUrl,
      image_data_url: `data:image/png;base64,${b64}`,
      identity_reference_count: 1,
      identity_role_used: referenceMode === "pet_identity" ? selectedRef.identity_role : null,
      source_media_id: selectedSourceMedia?.id || null,
      reference_mode: referenceMode,
      identity_lock: true,
      continuity_lock: true,
      continuity_version: "visual-bible-v1",
      visual_bible: referenceMode === "comic_visual_bible",
      visual_bible_panel_number: visualBiblePanelNumber,
    });
  } catch (e) {
    console.error(`[${ROUTE_VERSION}] UNHANDLED ERROR`, {
      diagnosticStage,
      name: e instanceof Error ? e.name : typeof e,
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      cause: e instanceof Error ? (e as any).cause : undefined,
    });
    return NextResponse.json(
      {
        error: `[${ROUTE_VERSION}] ${e instanceof Error ? e.message : "Unknown server error."}`,
        route_version: ROUTE_VERSION,
        diagnostic_stage: diagnosticStage,
      },
      { status: 500 }
    );
  }
}
