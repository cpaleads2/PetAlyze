import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

type Panel={panel_number:number;scene_text:string;caption:string;dialogue:string};
type Script={comic_title:string;panels:Panel[]};

export async function POST(req:NextRequest){
 try{
  const authHeader=req.headers.get("authorization");
  const token=authHeader?.startsWith("Bearer ")?authHeader.slice(7):null;
  if(!token)return NextResponse.json({error:"Unauthorized"},{status:401});

  const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const openaiKey=process.env.OPENAI_API_KEY;
  if(!supabaseUrl||!supabaseKey)return NextResponse.json({error:"Supabase environment variables are missing."},{status:500});
  if(!openaiKey)return NextResponse.json({error:"OPENAI_API_KEY is missing on the server."},{status:500});

  const supabase=createClient(supabaseUrl,supabaseKey,{
   global:{headers:{Authorization:`Bearer ${token}`}},
   auth:{persistSession:false,autoRefreshToken:false}
  });
  const {data:userData,error:userError}=await supabase.auth.getUser(token);
  if(userError||!userData.user)return NextResponse.json({error:"Invalid session. Please log in again."},{status:401});

  const body=await req.json();
  const comicId=String(body.comic_id||"");
  if(!comicId)return NextResponse.json({error:"Comic project is required."},{status:400});

  const {data:comic,error:comicError}=await supabase.from("ai_comics")
   .select("id,user_id,pet_id,title,source_text,tone,panel_count,pets(name,species,breed)")
   .eq("id",comicId).single();
  if(comicError||!comic)return NextResponse.json({error:"Comic project not found."},{status:404});
  if(!comic.source_text?.trim())return NextResponse.json({error:"Add a source moment before generating the script."},{status:400});

  const pet=Array.isArray(comic.pets)?comic.pets[0]:comic.pets;
  const prompt=`Convert the REAL MOMENT below into exactly four sequential comic panels.

AUTHORITATIVE PET PROFILE — FACTS, NOT SUGGESTIONS
Name: ${pet?.name||"Pet"}
Species: ${pet?.species||"unknown"}
Breed: ${pet?.breed||"unknown"}

SOURCE COMIC
Working title: ${comic.title}
Tone: ${comic.tone}
REAL MOMENT (authoritative plot): ${comic.source_text}

NON-NEGOTIABLE FIDELITY RULES
- The REAL MOMENT is the source of truth for the plot. Preserve its important actions, objects, cause-and-effect, event order, and outcome.
- Do NOT replace, reinterpret, embellish, or invent a different event. You may only compress or rephrase the source so it fits four panels.
- The pet profile above is the source of truth for identity. Never change or guess the pet's name, species, or breed.
- Never infer species, breed, color, age, size, or appearance from the story text. If a fact is absent, omit it rather than inventing it.
- If wording in the REAL MOMENT conflicts with the pet profile, the PET PROFILE wins for identity while the REAL MOMENT remains authoritative for actions and plot.
- Exactly 4 connected panels in chronological order.
- Distribute the actual event sequence across all four panels. Do not waste Panel 1 on generic setup when the source already contains action.
- Each panel must advance the real event. Preserve concrete physical actions and important objects mentioned in the source.
- Panel 1 begins the first meaningful action from the source.
- Panel 4 shows the actual outcome/aftermath from the source. Do not invent a different ending just to make it warmer or funnier.
- scene_text is a concrete visual description for later image generation, 1-2 concise sentences, showing exactly what happens in that beat.
- Use the pet's real name in scene_text where useful. Never relabel the pet as another animal type.
- caption is optional narration, maximum 18 words.
- dialogue is optional speech/thought text, maximum 14 words. Use an empty string when unnecessary.
- Captions/dialogue may express the requested tone but must not introduce new plot events or facts.
- Do not add people, animals, locations, props, obstacles, actions, or outcomes unless present in the REAL MOMENT or a direct visual consequence of it.
- Do not put image-generation instructions, camera jargon, hashtags, or emojis into captions/dialogue.
- Keep text suitable for a general audience.
- Before returning, silently verify: pet identity matches the profile; every major source action appears; event order is unchanged; no new plot beat was invented.
- Return JSON only.`;

  const response=await fetch("https://api.openai.com/v1/chat/completions",{
   method:"POST",
   headers:{Authorization:`Bearer ${openaiKey}`,"Content-Type":"application/json"},
   body:JSON.stringify({
    model:process.env.OPENAI_TEXT_MODEL||"gpt-5-mini",
    messages:[
     {role:"system",content:"You convert a user-provided real pet moment into a faithful four-panel comic script. Pet profile facts are authoritative for identity and the source moment is authoritative for plot. Never invent or substitute plot events or pet identity facts. Follow the JSON schema exactly."},
     {role:"user",content:prompt}
    ],
    response_format:{
     type:"json_schema",
     json_schema:{
      name:"petalyze_comic_script",
      strict:true,
      schema:{
       type:"object",
       additionalProperties:false,
       properties:{
        comic_title:{type:"string"},
        panels:{
         type:"array",minItems:4,maxItems:4,
         items:{
          type:"object",additionalProperties:false,
          properties:{
           panel_number:{type:"integer",minimum:1,maximum:4},
           scene_text:{type:"string"},
           caption:{type:"string"},
           dialogue:{type:"string"}
          },
          required:["panel_number","scene_text","caption","dialogue"]
         }
        }
       },
       required:["comic_title","panels"]
      }
     }
    }
   })
  });

  const json=await response.json();
  if(!response.ok)return NextResponse.json({error:json?.error?.message||`OpenAI script generation failed (${response.status}).`},{status:response.status});
  const raw=json?.choices?.[0]?.message?.content;
  if(!raw)return NextResponse.json({error:"OpenAI returned no script."},{status:502});

  let script:Script;
  try{script=JSON.parse(raw)}catch{return NextResponse.json({error:"OpenAI returned invalid script JSON."},{status:502})}
  if(!Array.isArray(script.panels)||script.panels.length!==4)return NextResponse.json({error:"The generated script did not contain exactly 4 panels."},{status:502});

  const normalized=script.panels
   .sort((a,b)=>a.panel_number-b.panel_number)
   .map((p,i)=>({
    comic_id:comic.id,user_id:userData.user.id,panel_number:i+1,
    scene_text:String(p.scene_text||"").trim(),
    caption:String(p.caption||"").trim(),
    dialogue:String(p.dialogue||"").trim()
   }));

  const {error:deleteError}=await supabase.from("ai_comic_panels").delete().eq("comic_id",comic.id);
  if(deleteError)return NextResponse.json({error:deleteError.message},{status:500});
  const {error:insertError}=await supabase.from("ai_comic_panels").insert(normalized);
  if(insertError)return NextResponse.json({error:insertError.message},{status:500});
  const {error:updateError}=await supabase.from("ai_comics").update({status:"script_ready",updated_at:new Date().toISOString()}).eq("id",comic.id);
  if(updateError)return NextResponse.json({error:updateError.message},{status:500});

  return NextResponse.json({script:{...script,panels:normalized}});
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:"Unknown server error."},{status:500});
 }
}
