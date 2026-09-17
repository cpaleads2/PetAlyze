import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

type StoryBody = {
  pet_id?: string;
  style?: string;
  memory?: string;
};

function cleanJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
  }
  return trimmed;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 });
    }

    if (!openaiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is missing on the server." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData.user;

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid session. Please log in again." }, { status: 401 });
    }

    const body = (await req.json()) as StoryBody;
    const petId = String(body.pet_id || "");
    const style = String(body.style || "Heartwarming").slice(0, 60);
    const memory = String(body.memory || "").trim().slice(0, 5000);

    if (!petId || !memory) {
      return NextResponse.json({ error: "Pet and memory are required." }, { status: 400 });
    }

    const { data: pet, error: petError } = await supabase
      .from("pets")
      .select("id,name,species,breed,sex,birth_date,notes")
      .eq("id", petId)
      .single();

    if (petError || !pet) {
      return NextResponse.json({ error: "Pet not found." }, { status: 404 });
    }

    const { data: journal } = await supabase
      .from("journal_entries")
      .select("title,entry_date,category,content")
      .eq("pet_id", petId)
      .order("entry_date", { ascending: false })
      .limit(5);

    const recentMemories = (journal || [])
      .map((entry) => `- ${entry.entry_date} [${entry.category}] ${entry.title}: ${entry.content}`)
      .join("\n");

    // v0.10.0c: charge 2 credits before the paid AI call.
    // Every handled technical failure below refunds this charge.
    const chargeOperationKey = `story:${crypto.randomUUID()}`;
    const refundOperationKey = `refund:${chargeOperationKey}`;
    let creditsCharged = false;

    const { data: chargeRows, error: chargeError } = await supabase.rpc(
      "petalyze_charge_credits",
      {
        p_amount: 2,
        p_operation_key: chargeOperationKey,
        p_reference_type: "ai_story",
        p_reference_id: petId,
        p_metadata: { source: "ai_story", version: "v0.10.0c" },
      }
    );

    if (chargeError) {
      return NextResponse.json({ error: chargeError.message }, { status: 500 });
    }

    const chargeResult = Array.isArray(chargeRows) ? chargeRows[0] : chargeRows;
    if (!chargeResult?.success) {
      return NextResponse.json(
        { error: "Not enough AI Credits. This story costs 2 credits." },
        { status: 402 }
      );
    }
    creditsCharged = true;

    async function refundCredits(reason: string) {
      if (!creditsCharged) return;
      await supabase.rpc("petalyze_refund_credits", {
        p_charge_operation_key: chargeOperationKey,
        p_refund_operation_key: refundOperationKey,
        p_metadata: { reason, automatic: true, version: "v0.10.0c" },
      });
      creditsCharged = false;
    }

    const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
    const client = new OpenAI({ apiKey: openaiKey });

    const prompt = `You are PetAlyze Memory Studio, a warm but not childish writing assistant for pet owners.

Create one personalized pet story based only on the supplied facts. Do not invent medical claims or pretend to diagnose health.
Style requested: ${style}

Pet:
Name: ${pet.name}
Species: ${pet.species || "unknown"}
Breed: ${pet.breed || "unknown"}
Sex: ${pet.sex || "unknown"}
Birthday: ${pet.birth_date || "unknown"}
Notes: ${pet.notes || "none"}

User's selected memory:
${memory}

Recent journal context:
${recentMemories || "No recent journal entries."}

Return ONLY valid JSON with exactly these string fields:
{
  "title": "...",
  "story": "...",
  "social_caption": "..."
}

Requirements:
- title: concise and memorable
- story: approximately 180-300 words
- social_caption: concise, social-ready, no more than 2 short sentences
- preserve the pet's real name and facts
- no markdown fences`;

    let response;
    try {
      response = await client.responses.create({
        model,
        input: prompt,
      });
    } catch (error) {
      await refundCredits("openai_request_failed");
      const message = error instanceof Error ? error.message : "AI generation failed.";
      return NextResponse.json({ error: `${message} Credits were returned.` }, { status: 502 });
    }

    const raw = response.output_text;
    let generated: { title: string; story: string; social_caption: string };

    try {
      generated = JSON.parse(cleanJson(raw));
    } catch {
      await refundCredits("invalid_ai_json");
      return NextResponse.json(
        { error: "AI returned an unexpected format. Please try again. Credits were returned." },
        { status: 502 }
      );
    }

    if (!generated.title || !generated.story || !generated.social_caption) {
      await refundCredits("incomplete_ai_response");
      return NextResponse.json({ error: "AI response was incomplete. Credits were returned." }, { status: 502 });
    }

    const { data: saved, error: saveError } = await supabase
      .from("ai_stories")
      .insert({
        user_id: user.id,
        pet_id: petId,
        style,
        source_memory: memory,
        title: generated.title,
        story: generated.story,
        social_caption: generated.social_caption,
        model,
      })
      .select("id,title,story,social_caption,created_at")
      .single();

    if (saveError) {
      await refundCredits("story_save_failed");
      return NextResponse.json({ error: `${saveError.message} Credits were returned.` }, { status: 500 });
    }

    return NextResponse.json({
      story: saved,
      credits_charged: 2,
      credits_remaining: chargeResult.total_credits,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
