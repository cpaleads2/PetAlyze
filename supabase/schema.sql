-- PetAlyze MVP v0.3
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  species text, breed text, birth_date date, sex text,
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg >= 0),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.pets enable row level security;
drop policy if exists "Users can read own pets" on public.pets;
create policy "Users can read own pets" on public.pets for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert own pets" on public.pets;
create policy "Users can insert own pets" on public.pets for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own pets" on public.pets;
create policy "Users can update own pets" on public.pets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own pets" on public.pets;
create policy "Users can delete own pets" on public.pets for delete to authenticated using ((select auth.uid()) = user_id);
create index if not exists pets_user_id_idx on public.pets(user_id);
