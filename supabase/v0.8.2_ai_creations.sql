-- PetAlyze v0.8.2 — AI Illustration

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'ai-creations','ai-creations',false,15728640,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.ai_creations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  source_media_id uuid references public.pet_media(id) on delete set null,
  creation_type text not null default 'illustration',
  style text,
  prompt text not null,
  model text not null,
  quality text,
  image_size text,
  storage_path text not null unique,
  mime_type text not null default 'image/png',
  created_at timestamptz not null default now()
);

alter table public.ai_creations enable row level security;

drop policy if exists "Users can view own AI creations" on public.ai_creations;
create policy "Users can view own AI creations"
on public.ai_creations for select to authenticated
using (
  auth.uid()=user_id
  and exists (
    select 1 from public.pets
    where pets.id=ai_creations.pet_id and pets.user_id=auth.uid()
  )
);

drop policy if exists "Users can insert own AI creations" on public.ai_creations;
create policy "Users can insert own AI creations"
on public.ai_creations for insert to authenticated
with check (
  auth.uid()=user_id
  and exists (
    select 1 from public.pets
    where pets.id=ai_creations.pet_id and pets.user_id=auth.uid()
  )
);

drop policy if exists "Users can delete own AI creations" on public.ai_creations;
create policy "Users can delete own AI creations"
on public.ai_creations for delete to authenticated
using (auth.uid()=user_id);

create index if not exists ai_creations_user_id_idx on public.ai_creations(user_id);
create index if not exists ai_creations_pet_id_idx on public.ai_creations(pet_id);
create index if not exists ai_creations_source_media_id_idx on public.ai_creations(source_media_id);
create index if not exists ai_creations_created_at_idx on public.ai_creations(created_at desc);

drop policy if exists "Users can read own ai-creation files" on storage.objects;
create policy "Users can read own ai-creation files"
on storage.objects for select to authenticated
using (
  bucket_id='ai-creations'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "Users can upload own ai-creation files" on storage.objects;
create policy "Users can upload own ai-creation files"
on storage.objects for insert to authenticated
with check (
  bucket_id='ai-creations'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "Users can delete own ai-creation files" on storage.objects;
create policy "Users can delete own ai-creation files"
on storage.objects for delete to authenticated
using (
  bucket_id='ai-creations'
  and (storage.foldername(name))[1]=auth.uid()::text
);
