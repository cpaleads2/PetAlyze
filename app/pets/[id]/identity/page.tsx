"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/app-shell";
import AuthGuard from "@/components/auth-guard";
import { supabase } from "@/lib/supabase/client";

type Pet={id:string;name:string;species:string|null;breed:string|null};
type Media={id:string;pet_id:string;storage_path:string;original_name:string;caption:string|null;identity_role:string|null;identity_priority:number|null;created_at:string;signedUrl?:string|null};

const LABELS:Record<string,string>={
 primary:"Primary identity",face:"Face close-up",profile:"Side profile",
 full_body:"Full body",additional:"Additional reference"
};
const PRIORITY:Record<string,number>={primary:1,face:10,profile:20,full_body:30,additional:50};

export default function PetIdentityPage(){
 const params=useParams<{id:string}>();
 const petId=String(params.id||"");
 const [pet,setPet]=useState<Pet|null>(null);
 const [media,setMedia]=useState<Media[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState<string|null>(null);
 const [message,setMessage]=useState("");

 async function load(){
  setLoading(true);
  const [{data:p,error:pe},{data:m,error:me}]=await Promise.all([
   supabase.from("pets").select("id,name,species,breed").eq("id",petId).single(),
   supabase.from("pet_media").select("id,pet_id,storage_path,original_name,caption,identity_role,identity_priority,created_at").eq("pet_id",petId).order("created_at",{ascending:true})
  ]);
  if(pe||!p){setMessage(pe?.message||"Pet not found.");setLoading(false);return;}
  if(me){setMessage(me.message);setLoading(false);return;}
  setPet(p as Pet);
  const rows=(m||[]) as Media[];
  const withUrls=await Promise.all(rows.map(async x=>{
   const {data}=await supabase.storage.from("pet-media").createSignedUrl(x.storage_path,3600);
   return {...x,signedUrl:data?.signedUrl||null};
  }));
  setMedia(withUrls);setLoading(false);
 }
 useEffect(()=>{if(petId)load();},[petId]);

 const selected=useMemo(()=>media.filter(x=>x.identity_role).sort((a,b)=>(a.identity_priority||50)-(b.identity_priority||50)),[media]);

 async function setRole(item:Media,role:string|null){
  setSaving(item.id);setMessage("");
  if(role==="primary"){
   const {error}=await supabase.from("pet_media").update({identity_role:null,identity_priority:null}).eq("pet_id",petId).eq("identity_role","primary").neq("id",item.id);
   if(error){setSaving(null);setMessage(error.message);return;}
  }
  const {error}=await supabase.from("pet_media").update({
   identity_role:role,identity_priority:role?PRIORITY[role]:null
  }).eq("id",item.id);
  setSaving(null);
  if(error){setMessage(error.message);return;}
  await load();
  setMessage(role?`${LABELS[role]} saved ✓`:"Removed from Identity Set.");
 }

 return <AuthGuard><AppShell>
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
   <div>
    <p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">Pet Identity</p>
    <h1 className="mt-1 text-3xl font-bold">{pet?`${pet.name}'s Identity Set`:"Identity Set"}</h1>
    <p className="mt-2 max-w-3xl text-[var(--muted)]">Choose real reference photos that define this pet. This set will become the identity foundation for illustrations, comics, video and Memory Books.</p>
   </div>
   <Link href="/media" className="btn btn-secondary">📷 Media Library</Link>
  </div>

  {message&&<p className="mt-5 rounded-2xl bg-[var(--cream)] p-4 text-sm">{message}</p>}

  {loading?<div className="card mt-6 p-8 text-[var(--muted)]">Loading identity photos…</div>:
  <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
   <section className="card p-6">
    <h2 className="text-xl font-bold">Choose reference photos</h2>
    <p className="mt-1 text-sm text-[var(--muted)]">A strong set can include a primary photo, face close-up, side profile and full-body view.</p>
    {media.length===0?<div className="mt-5 rounded-2xl bg-[var(--cream)] p-6">
     <h3 className="font-bold">No photos for this pet yet</h3>
     <Link href="/media" className="btn btn-primary mt-4">Upload photos</Link>
    </div>:
    <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
     {media.map(item=><article key={item.id} className="overflow-hidden rounded-2xl border border-[var(--line)]">
      <div className="aspect-square bg-[var(--cream)]">
       {item.signedUrl?<img src={item.signedUrl} alt={item.caption||item.original_name} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center">Preview unavailable</div>}
      </div>
      <div className="p-4">
       <p className="min-h-6 text-sm">{item.caption||item.original_name}</p>
       <label className="label mt-4">Identity role</label>
       <select className="input" value={item.identity_role||""} disabled={saving===item.id} onChange={e=>setRole(item,e.target.value||null)}>
        <option value="">Not in Identity Set</option>
        <option value="primary">Primary identity</option>
        <option value="face">Face close-up</option>
        <option value="profile">Side profile</option>
        <option value="full_body">Full body</option>
        <option value="additional">Additional reference</option>
       </select>
      </div>
     </article>)}
    </div>}
   </section>

   <aside className="card h-fit p-6">
    <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--green)]">Identity Foundation</p>
    <h2 className="mt-2 text-xl font-bold">{selected.length} reference{selected.length===1?"":"s"}</h2>
    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">This version only organizes real reference photos. It makes no paid AI calls.</p>
    <div className="mt-5 space-y-3">
     {selected.length===0?<div className="rounded-2xl bg-[var(--cream)] p-4 text-sm">Start by assigning one photo as <b>Primary identity</b>.</div>:
     selected.map(item=><div key={item.id} className="flex items-center gap-3 rounded-2xl border border-[var(--line)] p-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--cream)]">{item.signedUrl&&<img src={item.signedUrl} alt="" className="h-full w-full object-cover"/>}</div>
      <div className="min-w-0"><p className="font-bold">{LABELS[item.identity_role||""]}</p><p className="truncate text-xs text-[var(--muted)]">{item.caption||item.original_name}</p></div>
     </div>)}
    </div>
    <div className="mt-6 rounded-2xl bg-[var(--mint)] p-4 text-sm leading-6 text-[var(--green)]">Recommended target: 3–4 clear real photos. Quality matters more than filling every role.</div>
   </aside>
  </div>}
 </AppShell></AuthGuard>;
}
