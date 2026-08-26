"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app-shell";
import AuthGuard from "@/components/auth-guard";
import { supabase } from "@/lib/supabase/client";

type Pet = { id:string; name:string };
type MediaItem = {
  id:string; pet_id:string; storage_path:string; original_name:string;
  mime_type:string; size_bytes:number; caption:string|null; created_at:string;
  pets:{name:string}|{name:string}[]|null;
};
type MediaWithUrl = MediaItem & { signedUrl:string|null };

function petName(item: MediaItem) {
  if (Array.isArray(item.pets)) return item.pets[0]?.name || "Pet";
  return item.pets?.name || "Pet";
}
function extensionFor(file: File) {
  const ext=file.name.split(".").pop()?.toLowerCase();
  if(ext && ["jpg","jpeg","png","webp"].includes(ext)) return ext==="jpeg"?"jpg":ext;
  if(file.type==="image/png") return "png";
  if(file.type==="image/webp") return "webp";
  return "jpg";
}

export default function MediaLibraryPage() {
  const [pets,setPets]=useState<Pet[]>([]);
  const [items,setItems]=useState<MediaWithUrl[]>([]);
  const [loading,setLoading]=useState(true);
  const [uploading,setUploading]=useState(false);
  const [message,setMessage]=useState("");

  async function load() {
    setLoading(true);
    const [{data:petData},{data:mediaData,error:mediaError}] = await Promise.all([
      supabase.from("pets").select("id,name").order("created_at",{ascending:true}),
      supabase.from("pet_media")
        .select("id,pet_id,storage_path,original_name,mime_type,size_bytes,caption,created_at,pets(name)")
        .order("created_at",{ascending:false})
    ]);
    setPets(petData||[]);
    if(mediaError){setMessage(mediaError.message);setItems([]);setLoading(false);return;}
    const media=(mediaData||[]) as unknown as MediaItem[];
    const withUrls=await Promise.all(media.map(async item=>{
      const {data,error}=await supabase.storage.from("pet-media").createSignedUrl(item.storage_path,3600);
      return {...item,signedUrl:error?null:data.signedUrl};
    }));
    setItems(withUrls); setLoading(false);
  }

  useEffect(()=>{load();},[]);

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElement=e.currentTarget;
    const form=new FormData(formElement);
    const petId=String(form.get("pet_id")||"");
    const caption=String(form.get("caption")||"").trim();
    const file=form.get("photo");

    if(!(file instanceof File)||file.size===0){setMessage("Choose a photo first.");return;}
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
      setMessage("Please upload a JPG, PNG or WebP image.");return;
    }
    if(file.size>10*1024*1024){setMessage("Photo is too large. Maximum size is 10 MB.");return;}

    setUploading(true); setMessage("");
    const {data:auth,error:authError}=await supabase.auth.getUser();
    if(authError||!auth.user){setUploading(false);setMessage("Please log in again.");return;}

    const storagePath=`${auth.user.id}/${petId}/${crypto.randomUUID()}.${extensionFor(file)}`;
    const {error:uploadError}=await supabase.storage.from("pet-media").upload(storagePath,file,{
      contentType:file.type, cacheControl:"3600", upsert:false
    });
    if(uploadError){setUploading(false);setMessage(uploadError.message);return;}

    const {error:metadataError}=await supabase.from("pet_media").insert({
      user_id:auth.user.id, pet_id:petId, storage_path:storagePath,
      original_name:file.name, mime_type:file.type, size_bytes:file.size,
      caption:caption||null
    });

    if(metadataError){
      await supabase.storage.from("pet-media").remove([storagePath]);
      setUploading(false); setMessage(metadataError.message); return;
    }

    formElement.reset(); setUploading(false); setMessage("Photo uploaded and saved ✓");
    await load();
  }

  async function removeItem(item: MediaWithUrl) {
    if(!window.confirm("Delete this photo from PetAlyze?")) return;
    const {error:storageError}=await supabase.storage.from("pet-media").remove([item.storage_path]);
    if(storageError){setMessage(storageError.message);return;}
    const {error:dbError}=await supabase.from("pet_media").delete().eq("id",item.id);
    if(dbError){setMessage(dbError.message);return;}
    setMessage("Photo deleted."); await load();
  }

  return <AuthGuard><AppShell>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">Media Library</p>
        <h1 className="mt-1 text-3xl font-bold">Your pet photos</h1>
        <p className="mt-2 text-[var(--muted)]">
          Upload real pet photos now. These will become source material for AI illustrations, comics and future video.
        </p>
      </div>
      <span className="rounded-full bg-[var(--mint)] px-4 py-2 text-sm font-bold text-[var(--green)]">Private storage</span>
    </div>

    {message&&<p className="mt-5 rounded-2xl bg-[var(--cream)] p-4 text-sm">{message}</p>}

    <div className="mt-6 grid gap-6 xl:grid-cols-[390px_1fr]">
      <form onSubmit={upload} className="card h-fit p-6">
        <h2 className="text-xl font-bold">Upload pet photo</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">JPG, PNG or WebP. Maximum 10 MB.</p>
        <div className="mt-5 space-y-4">
          <div>
            <label className="label">Pet</label>
            <select name="pet_id" className="input" required defaultValue="">
              <option value="" disabled>Select a pet</option>
              {pets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Photo</label>
            <input name="photo" className="input" type="file" accept="image/jpeg,image/png,image/webp" required/>
          </div>
          <div>
            <label className="label">Caption (optional)</label>
            <textarea name="caption" className="input min-h-24" maxLength={500} placeholder="At the window, summer 2026..."/>
          </div>
          <button disabled={uploading||pets.length===0} className="btn btn-primary w-full" type="submit">
            {uploading?"Uploading…":"📷 Upload photo"}
          </button>
        </div>
      </form>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Saved media</h2>
          <span className="text-sm text-[var(--muted)]">{items.length} photos</span>
        </div>

        {loading ? <p className="mt-5 text-[var(--muted)]">Loading photos…</p> :
        items.length===0 ? (
          <div className="mt-5 rounded-2xl bg-[var(--cream)] p-6">
            <div className="text-4xl">📷</div>
            <h3 className="mt-3 text-lg font-bold">Add the first real pet photo</h3>
            <p className="mt-2 text-[var(--muted)]">
              Once uploaded, this photo stays linked to the pet and can later be used by AI Creative Studio.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {items.map(item=>(
              <article key={item.id} className="overflow-hidden rounded-2xl border border-[var(--line)]">
                <div className="aspect-square bg-[var(--cream)]">
                  {item.signedUrl ? (
                    <img src={item.signedUrl} alt={item.caption||item.original_name} className="h-full w-full object-cover"/>
                  ) : (
                    <div className="flex h-full items-center justify-center text-[var(--muted)]">Preview unavailable</div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--green)]">{petName(item)}</p>
                  {item.caption ? <p className="mt-2 leading-6">{item.caption}</p> :
                    <p className="mt-2 text-sm text-[var(--muted)]">{item.original_name}</p>}
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                    <Link href={`/pets/${item.pet_id}`} className="text-sm font-bold text-[var(--green)]">Pet profile →</Link>
                    <button type="button" onClick={()=>removeItem(item)} className="text-sm font-bold text-[var(--muted)]">Delete</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  </AppShell></AuthGuard>;
}
