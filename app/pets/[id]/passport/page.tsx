"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/app-shell";
import AuthGuard from "@/components/auth-guard";
import { supabase } from "@/lib/supabase/client";

type Pet = { id:string; name:string; species:string|null; breed:string|null };
type Passport = {
  id:string; microchip_number:string|null; microchip_date:string|null; sterilized:boolean;
  veterinarian_name:string|null; veterinary_clinic:string|null; emergency_contact:string|null; medical_notes:string|null;
};
type Vaccination = {
  id:string; vaccine_name:string; vaccination_date:string; next_due_date:string|null; veterinarian:string|null; notes:string|null;
};

export default function PassportPage() {
  const params = useParams<{ id: string }>();
  const petId = params.id;
  const [pet, setPet] = useState<Pet|null>(null);
  const [passport, setPassport] = useState<Passport|null>(null);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPassport, setSavingPassport] = useState(false);
  const [savingVaccination, setSavingVaccination] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const [{data:petData},{data:passportData},{data:vaccinationData}] = await Promise.all([
      supabase.from("pets").select("id,name,species,breed").eq("id",petId).single(),
      supabase.from("pet_passports").select("id,microchip_number,microchip_date,sterilized,veterinarian_name,veterinary_clinic,emergency_contact,medical_notes").eq("pet_id",petId).maybeSingle(),
      supabase.from("pet_vaccinations").select("id,vaccine_name,vaccination_date,next_due_date,veterinarian,notes").eq("pet_id",petId).order("vaccination_date",{ascending:false}),
    ]);
    setPet(petData||null); setPassport(passportData||null); setVaccinations(vaccinationData||[]); setLoading(false);
  }

  useEffect(()=>{ load(); },[petId]);

  async function savePassport(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSavingPassport(true); setMessage("");
    const {data:auth} = await supabase.auth.getUser();
    if (!auth.user) { setSavingPassport(false); setMessage("Please log in again."); return; }

    const payload = {
      user_id:auth.user.id, pet_id:petId,
      microchip_number:String(form.get("microchip_number")||"").trim()||null,
      microchip_date:String(form.get("microchip_date")||"")||null,
      sterilized:form.get("sterilized")==="on",
      veterinarian_name:String(form.get("veterinarian_name")||"").trim()||null,
      veterinary_clinic:String(form.get("veterinary_clinic")||"").trim()||null,
      emergency_contact:String(form.get("emergency_contact")||"").trim()||null,
      medical_notes:String(form.get("medical_notes")||"").trim()||null,
      updated_at:new Date().toISOString(),
    };
    const {error}=await supabase.from("pet_passports").upsert(payload,{onConflict:"pet_id"});
    setSavingPassport(false);
    if(error){setMessage(error.message);return;}
    setMessage("Pet Passport saved ✓"); await load();
  }

  async function saveVaccination(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElement=e.currentTarget; const form=new FormData(formElement);
    setSavingVaccination(true); setMessage("");
    const {data:auth}=await supabase.auth.getUser();
    if(!auth.user){setSavingVaccination(false);setMessage("Please log in again.");return;}

    const payload={
      user_id:auth.user.id, pet_id:petId,
      vaccine_name:String(form.get("vaccine_name")||"").trim(),
      vaccination_date:String(form.get("vaccination_date")||""),
      next_due_date:String(form.get("next_due_date")||"")||null,
      veterinarian:String(form.get("veterinarian")||"").trim()||null,
      notes:String(form.get("notes")||"").trim()||null,
    };
    const {error}=await supabase.from("pet_vaccinations").insert(payload);
    setSavingVaccination(false);
    if(error){setMessage(error.message);return;}
    formElement.reset(); setMessage("Vaccination saved ✓"); await load();
  }

  return <AuthGuard><AppShell>
    {loading||!pet ? <div className="card p-8 text-[var(--muted)]">Loading Pet Passport…</div> :
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href={`/pets/${petId}`} className="text-sm font-bold text-[var(--green)]">← Back to {pet.name}</Link>
          <p className="mt-5 text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">Digital Pet Passport</p>
          <h1 className="mt-1 text-3xl font-bold">{pet.name}</h1>
          <p className="mt-2 text-[var(--muted)]">{[pet.breed,pet.species].filter(Boolean).join(" · ")||"Pet profile"}</p>
        </div>
        <span className="rounded-full bg-[var(--mint)] px-4 py-2 text-sm font-bold text-[var(--green)]">Saved in Supabase</span>
      </div>

      {message && <p className="mt-5 rounded-2xl bg-[var(--cream)] p-4 text-sm">{message}</p>}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_.9fr]">
        <form onSubmit={savePassport} className="card p-7">
          <h2 className="text-2xl font-bold">Passport details</h2>
          <p className="mt-2 text-[var(--muted)]">Identification and important veterinary contacts.</p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div><label className="label">Microchip number</label><input name="microchip_number" className="input" defaultValue={passport?.microchip_number||""} placeholder="985141000000000"/></div>
            <div><label className="label">Microchip date</label><input name="microchip_date" className="input" type="date" defaultValue={passport?.microchip_date||""}/></div>
            <div className="sm:col-span-2"><label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] p-4"><input name="sterilized" type="checkbox" defaultChecked={passport?.sterilized||false}/><span className="font-bold">Sterilized / neutered</span></label></div>
            <div><label className="label">Veterinarian</label><input name="veterinarian_name" className="input" defaultValue={passport?.veterinarian_name||""} placeholder="Dr. Smith"/></div>
            <div><label className="label">Veterinary clinic</label><input name="veterinary_clinic" className="input" defaultValue={passport?.veterinary_clinic||""} placeholder="Happy Paws Clinic"/></div>
            <div className="sm:col-span-2"><label className="label">Emergency contact</label><input name="emergency_contact" className="input" defaultValue={passport?.emergency_contact||""} placeholder="+380..."/></div>
            <div className="sm:col-span-2"><label className="label">Medical notes</label><textarea name="medical_notes" className="input min-h-28" defaultValue={passport?.medical_notes||""} placeholder="Allergies, chronic notes, important observations..."/></div>
          </div>
          <button disabled={savingPassport} className="btn btn-primary mt-6 w-full">{savingPassport?"Saving…":"Save Pet Passport"}</button>
        </form>

        <div className="space-y-6">
          <form onSubmit={saveVaccination} className="card p-7">
            <h2 className="text-2xl font-bold">Add vaccination</h2>
            <div className="mt-6 space-y-4">
              <div><label className="label">Vaccine</label><input name="vaccine_name" className="input" required placeholder="Rabies"/></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="label">Vaccination date</label><input name="vaccination_date" className="input" type="date" required/></div>
                <div><label className="label">Next due date</label><input name="next_due_date" className="input" type="date"/></div>
              </div>
              <div><label className="label">Veterinarian</label><input name="veterinarian" className="input" placeholder="Dr. Smith"/></div>
              <div><label className="label">Notes</label><textarea name="notes" className="input min-h-24" placeholder="Batch, reaction, reminder..."/></div>
              <button disabled={savingVaccination} className="btn btn-primary w-full">{savingVaccination?"Saving…":"Add vaccination"}</button>
            </div>
          </form>

          <div className="card p-7">
            <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Vaccination history</h2><span className="text-sm text-[var(--muted)]">{vaccinations.length}</span></div>
            {vaccinations.length===0 ? <p className="mt-5 rounded-2xl bg-[var(--cream)] p-4 text-[var(--muted)]">No vaccinations saved yet.</p> :
            <div className="mt-5 space-y-4">{vaccinations.map(item=>
              <article key={item.id} className="rounded-2xl border border-[var(--line)] p-5">
                <h3 className="text-lg font-bold">{item.vaccine_name}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">Given: {item.vaccination_date}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Next due: {item.next_due_date||"Not set"}</p>
                {item.veterinarian&&<p className="mt-1 text-sm text-[var(--muted)]">Vet: {item.veterinarian}</p>}
                {item.notes&&<p className="mt-3 leading-7 text-[var(--muted)]">{item.notes}</p>}
              </article>)}</div>}
          </div>
        </div>
      </div>
    </>}
  </AppShell></AuthGuard>;
}
