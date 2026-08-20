-- PetAlyze MVP v0.4 — AI Stories
-- Run this entire file in Supabase SQL Editor.

create table if not exists public.ai_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  style text not null default 'Heartwarming',
  source_memory text not null check (char_length(source_memory) between 1 and 5000),
  title text not null,
  story text not null,
  social_caption text,
  model text,
  created_at timestamptz not null default now()
);

alter table public.ai_stories enable row level security;

drop policy if exists "Users can read own AI stories" on public.ai_stories;
create policy "Users can read own AI stories"
on public.ai_stories for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own AI stories" on public.ai_stories;
create policy "Users can insert own AI stories"
on public.ai_stories for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.pets
    where pets.id = ai_stories.pet_id
      and pets.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete own AI stories" on public.ai_stories;
create policy "Users can delete own AI stories"
on public.ai_stories for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists ai_stories_user_created_idx
on public.ai_stories(user_id, created_at desc);

create index if not exists ai_stories_pet_id_idx
on public.ai_stories(pet_id);
