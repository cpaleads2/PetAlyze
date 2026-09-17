"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/app-shell";
import AuthGuard from "@/components/auth-guard";
import { supabase } from "@/lib/supabase/client";

type MediaItem={id:string;pet_id:string;storage_path:string;original_name:string;caption:string|null;pets:{name:string}|{name:string}[]|null};
type Creation={id:string;style:string|null;quality:string|null;transformation_mode:string|null;identity_reference_count:number|null;storage_path:string;created_at:string};
type CreationWithUrl=Creation&{signedUrl:string|null};

function relationName(r:MediaItem["pets"]){return Array.isArray(r)?r[0]?.name||"Pet":r?.name||"Pet";}
function modeLabel(mode:string|null){if(mode==="stylize")return "Stylize Photo";if(mode==="reimagine")return "Reimagine";return "Legacy";}

export default function AIIllustrationPage(){
  const searchParams=useSearchParams();
  const mediaId=searchParams.get("media_id")||"";
  const [media,setMedia]=useState<MediaItem|null>(null);
  const [sourceUrl,setSourceUrl]=useState<string|null>(null);
  const [creations,setCreations]=useState<CreationWithUrl[]>([]);
  const [selected,setSelected]=useState<CreationWithUrl|null>(null);
  const [identitySetCount,setIdentitySetCount]=useState(0);
  const [loading,setLoading]=useState(true);
  const [generating,setGenerating]=useState(false);
  const [message,setMessage]=useState("");
  const [credits,setCredits]=useState<number|null>(null);

  async function load(){
    setLoading(true);setMessage("");
    if(!mediaId){setLoading(false);return;}

    const {data:creditAccount}=await supabase.from("user_credit_accounts")
      .select("subscription_credits,purchased_credits").single();
    if(creditAccount)setCredits((creditAccount.subscription_credits||0)+(creditAccount.purchased_credits||0));

    const {data:mediaData,error:mediaError}=await supabase.from("pet_media")
      .select("id,pet_id,storage_path,original_name,caption,pets(name)").eq("id",mediaId).single();
    if(mediaError||!mediaData){setMessage(mediaError?.message||"Source photo not found.");setLoading(false);return;}

    const normalized=mediaData as unknown as MediaItem;setMedia(normalized);
    const [{data:sourceSigned},{data:creationData,error:creationError},{count:identityCount}]=await Promise.all([
      supabase.storage.from("pet-media").createSignedUrl(normalized.storage_path,3600),
      supabase.from("ai_creations").select("id,style,quality,transformation_mode,identity_reference_count,storage_path,created_at")
        .eq("source_media_id",mediaId).eq("creation_type","illustration").order("created_at",{ascending:false}),
      supabase.from("pet_media").select("*",{count:"exact",head:true}).eq("pet_id",normalized.pet_id).not("identity_role","is",null)
    ]);
    if(creationError){setMessage(creationError.message);setLoading(false);return;}
    setSourceUrl(sourceSigned?.signedUrl||null);
    setIdentitySetCount(identityCount||0);

    const list=(creationData||[]) as Creation[];
    const withUrls=await Promise.all(list.map(async item=>{
      const {data}=await supabase.storage.from("ai-creations").createSignedUrl(item.storage_path,3600);
      return {...item,signedUrl:data?.signedUrl||null};
    }));
    setCreations(withUrls);
    if(selected){
      const refreshed=withUrls.find(x=>x.id===selected.id);
      setSelected(refreshed||null);
    }
    setLoading(false);
  }

  useEffect(()=>{load();},[mediaId]);

  async function generate(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!media)return;
    const form=new FormData(e.currentTarget);setGenerating(true);setMessage("");
    const {data:sessionData}=await supabase.auth.getSession();
    const token=sessionData.session?.access_token;
    if(!token){setGenerating(false);setMessage("Please log in again.");return;}

    const response=await fetch("/api/ai/illustration",{
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
      body:JSON.stringify({
        media_id:media.id,
        transformation_mode:String(form.get("transformation_mode")||"stylize"),
        style:String(form.get("style")||"Storybook"),
        quality:String(form.get("quality")||"medium")
      })
    });
    const data=await response.json();setGenerating(false);
    if(!response.ok){setMessage(data.error||"Illustration generation failed.");return;}
    if(typeof data.credits_remaining==="number")setCredits(data.credits_remaining);
    setMessage("AI illustration created and saved ✓ · 8 credits used");
    await load();
    if(data.creation?.id){
      const {data:signed}=await supabase.storage.from("ai-creations").createSignedUrl(data.creation.storage_path,3600);
      setSelected({...data.creation,signedUrl:signed?.signedUrl||data.creation.signed_url||null});
    }
  }

  async function deleteCreation(item:CreationWithUrl){
    if(!window.confirm("Delete this AI creation from PetAlyze?"))return;
    const {error:storageError}=await supabase.storage.from("ai-creations").remove([item.storage_path]);
    if(storageError){setMessage(storageError.message);return;}
    const {error:dbError}=await supabase.from("ai_creations").delete().eq("id",item.id);
    if(dbError){setMessage(dbError.message);return;}
    setSelected(null);setMessage("AI creation deleted.");await load();
  }

  async function downloadCreation(item:CreationWithUrl){
    const {data,error}=await supabase.storage.from("ai-creations").download(item.storage_path);
    if(error||!data){setMessage(error?.message||"Download failed.");return;}
    const url=URL.createObjectURL(data);
    const a=document.createElement("a");a.href=url;
    a.download=`PetAlyze-${modeLabel(item.transformation_mode).replaceAll(" ","-")}-${item.style||"Illustration"}.png`;
    document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }

  if(!mediaId)return <AuthGuard><AppShell><div className="card p-8">
    <h1 className="text-2xl font-bold">Choose a source photo</h1>
    <p className="mt-2 text-[var(--muted)]">Start from Media Library and choose Create AI Illustration.</p>
    <Link href="/media" className="btn btn-primary mt-5">📷 Open Media Library</Link>
  </div></AppShell></AuthGuard>;

  return <AuthGuard><AppShell>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">AI Creative Studio</p>
        <h1 className="mt-1 text-3xl font-bold">Pet Identity Strategy</h1>
        <p className="mt-2 text-[var(--muted)]">Choose whether identity preservation or creative freedom matters most.</p>
      </div>
      <Link href="/media" className="btn btn-secondary">← Media Library</Link>
    </div>

    {message&&<p className="mt-5 rounded-2xl bg-[var(--cream)] p-4 text-sm">{message}</p>}

    {loading?<div className="card mt-6 p-8 text-[var(--muted)]">Loading source photo…</div>:
    !media?<div className="card mt-6 p-8">Source photo unavailable.</div>:
    <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]">
      <div className="space-y-6">
        <div className="card overflow-hidden">
          <div className="aspect-square bg-[var(--cream)]">
            {sourceUrl?<img src={sourceUrl} alt={media.caption||media.original_name} className="h-full w-full object-cover"/>:
            <div className="flex h-full items-center justify-center text-[var(--muted)]">Preview unavailable</div>}
          </div>
          <div className="p-5">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--green)]">Original photo</p>
            <h2 className="mt-2 text-xl font-bold">{relationName(media.pets)}</h2>
            {media.caption&&<p className="mt-2 text-[var(--muted)]">{media.caption}</p>}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--green)]">Pet Identity Set</p>
              <h2 className="mt-1 text-lg font-bold">{identitySetCount} references available</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">The source photo stays primary; other references help preserve identity.</p>
            </div>
            <Link href={`/pets/${media.pet_id}/identity`} className="btn btn-secondary">Manage</Link>
          </div>
        </div>

        <form onSubmit={generate} className="card p-6">
          <h2 className="text-xl font-bold">Illustration settings</h2>
          <div className="mt-5">
            <label className="label">Transformation mode</label>
            <select name="transformation_mode" className="input" defaultValue="stylize">
              <option value="stylize">Stylize Photo — preserve identity</option>
              <option value="reimagine">Reimagine — more creative freedom</option>
            </select>
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            Stylize Photo prioritizes resemblance and the original composition. Reimagine allows stronger artistic changes.
          </p>
          <div className="mt-4">
            <label className="label">Style</label>
            <select name="style" className="input" defaultValue="Storybook">
              <option>Storybook</option><option>Watercolor</option><option>Cute 3D</option><option>Cinematic Portrait</option>
            </select>
          </div>
          <div className="mt-4">
            <label className="label">Output quality</label>
            <select name="quality" className="input" defaultValue="medium">
              <option value="low">Preview — Low</option>
              <option value="medium">Final — Medium</option>
              <option value="high">Premium — High</option>
            </select>
          </div>
          <div className="mt-4 rounded-2xl bg-[var(--mint)] p-4 text-sm text-[var(--green)]">
            <div className="flex items-center justify-between gap-4">
              <span>1024×1024 · Identity preservation is prompt-guided, not guaranteed.</span>
              <span className="whitespace-nowrap font-bold">AI Credits: {credits===null?"…":credits}</span>
            </div>
          </div>
          <button type="submit" disabled={generating || (credits!==null && credits<8)} className="btn btn-primary mt-5 w-full">
            {generating?"Creating illustration…":credits!==null&&credits<8?"Not enough credits":"✨ Generate illustration · 8 credits"}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">AI Creations</h2><span className="text-sm text-[var(--muted)]">{creations.length}</span>
        </div>
        {creations.length===0?<div className="mt-5 rounded-2xl bg-[var(--cream)] p-7">
          <div className="text-4xl">🎨</div><h3 className="mt-3 text-lg font-bold">Your first illustration will appear here</h3>
        </div>:
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {creations.map(item=><article key={item.id} className="overflow-hidden rounded-2xl border border-[var(--line)]">
            <button type="button" onClick={()=>setSelected(item)} className="block aspect-square w-full bg-[var(--cream)]">
              {item.signedUrl?<img src={item.signedUrl} alt={`${item.style||"AI"} illustration`} className="h-full w-full object-cover"/>:
              <div className="flex h-full items-center justify-center text-[var(--muted)]">Preview unavailable</div>}
            </button>
            <div className="p-4">
              <p className="font-bold">{item.style||"AI Illustration"}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{modeLabel(item.transformation_mode)} · {item.quality||"unknown"} · 1024×1024</p>
              {(item.identity_reference_count||0)>0&&<p className="mt-2 text-xs font-bold text-[var(--green)]">🧬 Identity Set · {item.identity_reference_count} additional refs</p>}
              <button type="button" onClick={()=>setSelected(item)} className="mt-3 text-sm font-bold text-[var(--green)]">View & compare →</button>
            </div>
          </article>)}
        </div>}
      </div>
    </div>}

    {selected&&<div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 sm:p-8" onClick={()=>setSelected(null)}>
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-5 sm:p-7" onClick={e=>e.stopPropagation()}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-bold uppercase tracking-[.14em] text-[var(--green)]">AI Creation Viewer</p>
            <h2 className="mt-1 text-2xl font-bold">{modeLabel(selected.transformation_mode)} · {selected.style||"Illustration"}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{selected.quality||"unknown"} quality · 1024×1024</p>
            {(selected.identity_reference_count||0)>0&&<p className="mt-2 text-sm font-bold text-[var(--green)]">🧬 Identity Set · {selected.identity_reference_count} additional references used</p>}
          </div>
          <button type="button" onClick={()=>setSelected(null)} className="btn btn-secondary">✕ Close</button>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div><p className="mb-2 font-bold">Original</p><div className="overflow-hidden rounded-2xl bg-[var(--cream)]">
            {sourceUrl&&<img src={sourceUrl} alt="Original pet" className="h-auto w-full object-contain"/>}</div></div>
          <div><p className="mb-2 font-bold">AI Result</p><div className="overflow-hidden rounded-2xl bg-[var(--cream)]">
            {selected.signedUrl&&<img src={selected.signedUrl} alt="AI result" className="h-auto w-full object-contain"/>}</div></div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={()=>downloadCreation(selected)} className="btn btn-primary">↓ Download</button>
          <Link href={`/pets/${media?.pet_id}/identity`} className="btn btn-secondary">🧬 Manage Identity Set</Link>
          <button type="button" onClick={()=>deleteCreation(selected)} className="btn btn-secondary">Delete</button>
        </div>
      </div>
    </div>}
  </AppShell></AuthGuard>;
}
