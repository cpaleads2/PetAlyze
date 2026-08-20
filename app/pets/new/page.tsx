"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/app-shell";
import AuthGuard from "@/components/auth-guard";
import { supabase } from "@/lib/supabase/client";

export default function NewPet() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formElement = e.currentTarget;
    const form = new FormData(formElement);

    setLoading(true);
    setMessage("");

    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth.user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const weightValue = String(form.get("weight_kg") || "").trim();

    const payload = {
      user_id: auth.user.id,
      name: String(form.get("name") || "").trim(),
      species: String(form.get("species") || ""),
      breed: String(form.get("breed") || "").trim() || null,
      birth_date: String(form.get("birth_date") || "") || null,
      sex: String(form.get("sex") || "") || null,
      weight_kg: weightValue ? Number(weightValue) : null,
      notes: String(form.get("notes") || "").trim() || null,
    };

    const { data, error } = await supabase
      .from("pets")
      .insert(payload)
      .select("id")
      .single();

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(`/pets/${data.id}`);
    router.refresh();
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="card mx-auto max-w-2xl p-8">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--green)]">
            Pet profile
          </p>
          <h1 className="mt-2 text-3xl font-bold">Add your pet</h1>
          <p className="mt-2 text-[var(--muted)]">
            This profile will be saved in your Supabase database.
          </p>

          <form onSubmit={submit} className="mt-7 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Pet name</label>
              <input name="name" className="input" required placeholder="Luna" />
            </div>

            <div>
              <label className="label">Pet type</label>
              <select name="species" className="input" defaultValue="Dog">
                <option>Dog</option>
                <option>Cat</option>
                <option>Bird</option>
                <option>Rabbit</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="label">Breed</label>
              <input name="breed" className="input" placeholder="Golden Retriever" />
            </div>

            <div>
              <label className="label">Birthday</label>
              <input name="birth_date" className="input" type="date" />
            </div>

            <div>
              <label className="label">Sex</label>
              <select name="sex" className="input" defaultValue="">
                <option value="">Not specified</option>
                <option>Female</option>
                <option>Male</option>
              </select>
            </div>

            <div>
              <label className="label">Weight (kg)</label>
              <input
                name="weight_kg"
                className="input"
                type="number"
                min="0"
                step="0.1"
                placeholder="27"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">About your pet</label>
              <textarea
                name="notes"
                className="input min-h-28"
                placeholder="Favorite activities, character, routines..."
              />
            </div>

            {message && (
              <p className="sm:col-span-2 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                {message}
              </p>
            )}

            <div className="sm:col-span-2 flex gap-3">
              <Link href="/dashboard" className="btn btn-secondary flex-1">
                Cancel
              </Link>
              <button disabled={loading} type="submit" className="btn btn-primary flex-1">
                {loading ? "Saving…" : "Save pet"}
              </button>
            </div>
          </form>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
