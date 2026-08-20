# PetAlyze MVP v0.3 — Supabase Auth + Real Pet Profiles

1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Copy `.env.local.example` to `.env.local` and insert your Project URL and Publishable key.
4. Run `npm install` then `npm run dev`.
5. Create an account at `/signup`, then add a pet at `/pets/new`.

If email confirmation is enabled in Supabase Auth, confirm your email before logging in.

Security: Row Level Security ensures authenticated users only access their own rows in `pets`.
