import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body={media_id?:string;style?:string;quality?:string;transformation_mode?:string};
const STYLES:Record<string,string>={
 Storybook:"Use a refined storybook illustration aesthetic with natural colors, subtle painterly texture and a premium editorial finish.",
 Watercolor:"Use a refined watercolor aesthetic with delicate paper texture, natural washes and restrained expressive brushwork.",
 "Cute 3D":"Use a polished high-end 3D animated-film aesthetic with soft studio-quality lighting and realistic material detail; charming but not babyish.",
 "Cinematic Portrait":"Use a cinematic portrait aesthetic with premium photographic lighting, tasteful depth of field and detailed natural fur texture."
};
const QUALITIES=new Set(["low","medium","high"]), MODES=new Set(["stylize","reimagine"]);

export async function POST(req:NextRequest){
 try{
  const h=req.headers.get("authorization"),token=h?.startsWith("Bearer ")?h.slice(7):null;
  if(!token)return NextResponse.json({error:"Unauthorized"},{status:401});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,oa=process.env.OPENAI_API_KEY;
  if(!url||!key||!oa)return NextResponse.json({error:"Server environment variables are missing."},{status:500});
  const sb=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:u,error:ue}=await sb.auth.getUser(token); if(ue||!u.user)return NextResponse.json({error:"Invalid session."},{status:401});
  const b=(await req.json()) as Body, mediaId=String(b.media_id||""), style=String(b.style||"Storybook");
  const quality=QUALITIES.has(String(b.quality))?String(b.quality):"medium", mode=MODES.has(String(b.transformation_mode))?String(b.transformation_mode):"stylize";
  if(!mediaId||!STYLES[style])return NextResponse.json({error:"Invalid illustration request."},{status:400});

  const {data:m,error:me}=await sb.from("pet_media").select("id,pet_id,storage_path,original_name,caption,pets(name,species,breed)").eq("id",mediaId).single();
  if(me||!m)return NextResponse.json({error:"Source photo not found."},{status:404});
  const {data:refs,error:re}=await sb.from("pet_media").select("id,storage_path,original_name,identity_role,identity_priority").eq("pet_id",m.pet_id).not("identity_role","is",null).order("identity_priority",{ascending:true});
  if(re)return NextResponse.json({error:re.message},{status:500});
  const extras=(refs||[]).filter(x=>x.id!==m.id).slice(0,3);
  const {data:source,error:se}=await sb.storage.from("pet-media").download(m.storage_path);
  if(se||!source)return NextResponse.json({error:se?.message||"Could not download source photo."},{status:500});
  const downloaded:{blob:Blob;name:string}[]=[];
  for(const r of extras){const {data,error}=await sb.storage.from("pet-media").download(r.storage_path);if(!error&&data)downloaded.push({blob:data,name:r.original_name||"identity-reference.jpg"});}

  const p=Array.isArray(m.pets)?m.pets[0]:m.pets;
  const context=[p?.name?`Pet name: ${p.name}.`:"",p?.species?`Species: ${p.species}.`:"",p?.breed?`Breed: ${p.breed}.`:"",m.caption?`Source context: ${m.caption}.`:""].filter(Boolean).join(" ");
  const refsText=downloaded.length?`IMAGES 2-${downloaded.length+1} are identity references of the SAME PET. Use them only to verify stable identity traits (face geometry, muzzle, ears, eyes, coat colors, markings and body proportions). Never copy their backgrounds, poses or composition.`:"No additional identity references are available.";
  const preserve=`IMAGE 1 IS THE SOURCE PHOTO and controls scene, pose, camera angle, accessories and composition. EDIT IMAGE 1; DO NOT REDESIGN THE ANIMAL. Preserve this exact individual's facial geometry, muzzle, eyes, ears, coat colors, markings, proportions, expression, silhouette and accessories. Do not beautify, genericize, change breed, age, anatomy or markings. Apply style mainly through texture, color, lighting and rendering. ${refsText}`;
  const creative=`IMAGE 1 is the primary source. ${refsText} Keep the pet recognizably consistent, but you may reinterpret pose, environment and composition.`;
  const prompt=`${mode==="stylize"?preserve:creative}\n${STYLES[style]}\n${context}\nNo text, logos, extra animals or invented clothing.`;

  const creditCost=8;
  const chargeKey=`illustration:${u.user.id}:${crypto.randomUUID()}`;
  const {data:charge,error:chargeError}=await sb.rpc("petalyze_charge_credits",{
    p_amount:creditCost,
    p_operation_key:chargeKey,
    p_reference_type:"ai_illustration",
    p_reference_id:mediaId,
    p_metadata:{style,quality,transformation_mode:mode}
  });
  if(chargeError)return NextResponse.json({error:chargeError.message},{status:500});
  const chargeRow=Array.isArray(charge)?charge[0]:charge;
  if(!chargeRow?.success)return NextResponse.json({error:"Not enough AI credits. Illustration requires 8 credits."},{status:402});

  const refund=async(reason:string)=>{
    await sb.rpc("petalyze_refund_credits",{
      p_charge_operation_key:chargeKey,
      p_refund_operation_key:`refund:${chargeKey}`,
      p_metadata:{reason}
    });
  };

  const form=new FormData(); form.append("model",process.env.OPENAI_IMAGE_MODEL||"gpt-image-2");
  form.append("image[]",source,m.original_name||"source.png"); for(const r of downloaded)form.append("image[]",r.blob,r.name);
  form.append("prompt",prompt); form.append("size","1024x1024"); form.append("quality",quality);
  let rr:Response;
  let j:any;
  try{
    rr=await fetch("https://api.openai.com/v1/images/edits",{method:"POST",headers:{Authorization:`Bearer ${oa}`},body:form});
    j=await rr.json();
  }catch(error){
    await refund("openai_request_failed");
    return NextResponse.json({error:error instanceof Error?error.message:"OpenAI request failed."},{status:502});
  }
  if(!rr.ok){await refund("openai_image_edit_failed");return NextResponse.json({error:j?.error?.message||`OpenAI image edit failed (${rr.status}).`},{status:rr.status});}
  const b64=j?.data?.[0]?.b64_json;if(!b64){await refund("openai_no_image_data");return NextResponse.json({error:"OpenAI returned no image data."},{status:502});}
  const path=`${u.user.id}/${m.pet_id}/${crypto.randomUUID()}.png`, bytes=Buffer.from(b64,"base64");
  const {error:up}=await sb.storage.from("ai-creations").upload(path,bytes,{contentType:"image/png",cacheControl:"3600",upsert:false});
  if(up){await refund("storage_upload_failed");return NextResponse.json({error:up.message},{status:500});}
  const {data:c,error:ce}=await sb.from("ai_creations").insert({user_id:u.user.id,pet_id:m.pet_id,source_media_id:m.id,creation_type:"illustration",transformation_mode:mode,style,prompt,model:process.env.OPENAI_IMAGE_MODEL||"gpt-image-2",quality,image_size:"1024x1024",identity_reference_count:downloaded.length,storage_path:path,mime_type:"image/png"}).select("id,style,quality,transformation_mode,identity_reference_count,storage_path,created_at").single();
  if(ce){await sb.storage.from("ai-creations").remove([path]);await refund("creation_save_failed");return NextResponse.json({error:ce.message},{status:500});}
  const {data:signed}=await sb.storage.from("ai-creations").createSignedUrl(path,3600);
  const {data:account}=await sb.from("user_credit_accounts").select("subscription_credits,purchased_credits").single();
  const creditsRemaining=account?(account.subscription_credits||0)+(account.purchased_credits||0):null;
  return NextResponse.json({creation:{...c,signed_url:signed?.signedUrl||null},credits_remaining:creditsRemaining});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unknown server error."},{status:500});}
}