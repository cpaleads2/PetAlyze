"use client";

import AppShell from "@/components/app-shell";
import AuthGuard from "@/components/auth-guard";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Pet = {
  id:string;
  name:string;
  species:string|null;
  breed:string|null;
  birth_date:string|null;
  sex:string|null;
  weight_kg:number|null;
  notes:string|null;
};

export default function PetProfile() {
  const params=useParams<{id:string}>();
  const router=useRouter();

  const [pet,setPet]=useState<Pet|null>(null);
  const [loading,setLoading]=useState(true);
  const [vaccinationCount,setVaccinationCount]=useState(0);
  const [photoCount,setPhotoCount]=useState(0);
  const [identityCount,setIdentityCount]=useState(0);

  useEffect(()=>{
    (async()=>{
      const [
        {data,error},
        {count:vaccinations},
        {count:photos},
        {count:identityRefs},
      ] = await Promise.all([
        supabase
          .from("pets")
          .select("id,name,species,breed,birth_date,sex,weight_kg,notes")
          .eq("id",params.id)
          .single(),

        supabase
          .from("pet_vaccinations")
          .select("*",{count:"exact",head:true})
          .eq("pet_id",params.id),

        supabase
          .from("pet_media")
          .select("*",{count:"exact",head:true})
          .eq("pet_id",params.id),

        supabase
          .from("pet_media")
          .select("*",{count:"exact",head:true})
          .eq("pet_id",params.id)
          .not("identity_role","is",null),
      ]);

      if(error||!data){
        router.replace("/dashboard");
        return;
      }

      setPet(data);
      setVaccinationCount(vaccinations||0);
      setPhotoCount(photos||0);
      setIdentityCount(identityRefs||0);
      setLoading(false);
    })();
  },[params.id,router]);

  return <AuthGuard><AppShell>
    {loading||!pet ? (
      <div className="card p-8 text-[var(--muted)]">
        Loading pet profile…
      </div>
    ) : (
      <>
        <div className="card p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-[var(--mint)] text-6xl">
                {pet.species?.toLowerCase()==="cat"?"🐈":
                 pet.species?.toLowerCase()==="bird"?"🐦":
                 pet.species?.toLowerCase()==="rabbit"?"🐇":"🐕"}
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">
                  Real pet profile
                </p>
                <h1 className="mt-1 text-4xl font-bold">{pet.name}</h1>
                <p className="mt-2 text-[var(--muted)]">
                  {[pet.breed,pet.species,pet.sex].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/pets/${pet.id}/identity`}
                className="btn btn-secondary"
              >
                🧬 Identity Set
              </Link>

              <Link
                href={`/pets/${pet.id}/passport`}
                className="btn btn-primary"
              >
                🪪 Open Pet Passport
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl bg-[var(--cream)] p-4">
              <p className="text-xs text-[var(--muted)]">Birthday</p>
              <b>{pet.birth_date||"Not set"}</b>
            </div>

            <div className="rounded-2xl bg-[var(--cream)] p-4">
              <p className="text-xs text-[var(--muted)]">Weight</p>
              <b>{pet.weight_kg?`${pet.weight_kg} kg`:"Not set"}</b>
            </div>

            <div className="rounded-2xl bg-[var(--cream)] p-4">
              <p className="text-xs text-[var(--muted)]">Photos</p>
              <b>{photoCount}</b>
            </div>

            <div className="rounded-2xl bg-[var(--cream)] p-4">
              <p className="text-xs text-[var(--muted)]">Identity refs</p>
              <b>{identityCount}</b>
            </div>

            <div className="rounded-2xl bg-[var(--cream)] p-4">
              <p className="text-xs text-[var(--muted)]">Vaccinations</p>
              <b>{vaccinationCount}</b>
            </div>
          </div>

          {pet.notes&&(
            <div className="mt-6 rounded-2xl border border-[var(--line)] p-5">
              <p className="text-xs font-bold uppercase text-[var(--muted)]">
                About
              </p>
              <p className="mt-2 leading-7">{pet.notes}</p>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="card p-6">
            <h2 className="text-xl font-bold">Smart Journal</h2>
            <p className="mt-3 text-[var(--muted)]">
              Save everyday moments and milestones.
            </p>
            <Link
              href="/journal"
              className="mt-5 inline-block font-bold text-[var(--green)]"
            >
              Open journal →
            </Link>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-bold">AI Memory Studio</h2>
            <p className="mt-3 text-[var(--muted)]">
              Turn real memories into polished stories.
            </p>
            <Link
              href="/ai-story"
              className="mt-5 inline-block font-bold text-[var(--green)]"
            >
              Create story →
            </Link>
          </div>

          <div className="card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Pet Identity</h2>
                <p className="mt-3 text-[var(--muted)]">
                  Build a reference set so future AI creations can better recognize this specific pet.
                </p>
              </div>

              {identityCount>0 && (
                <span className="rounded-full bg-[var(--mint)] px-3 py-1 text-xs font-bold text-[var(--green)]">
                  {identityCount}
                </span>
              )}
            </div>

            <Link
              href={`/pets/${pet.id}/identity`}
              className="mt-5 inline-block font-bold text-[var(--green)]"
            >
              Manage Identity Set →
            </Link>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-bold">Pet Passport</h2>
            <p className="mt-3 text-[var(--muted)]">
              Microchip, vet contacts and vaccination history.
            </p>
            <Link
              href={`/pets/${pet.id}/passport`}
              className="mt-5 inline-block font-bold text-[var(--green)]"
            >
              Open passport →
            </Link>
          </div>
        </div>
      </>
    )}
  </AppShell></AuthGuard>;
}
