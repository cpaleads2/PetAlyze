-- PetAlyze v0.8.1 — Pet Photos + Supabase Storage

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'pet-media','pet-media',false,10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.pet_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  caption text,
  created_at timestamptz not null default now()
);

alter table public.pet_media enable row level security;

drop policy if exists "Users can view own pet media" on public.pet_media;
create policy "Users can view own pet media"
on public.pet_media for select to authenticated
using (
  auth.uid()=user_id
  and exists (
    select 1 from public.pets
    where pets.id=pet_media.pet_id and pets.user_id=auth.uid()
  )
);

drop policy if exists "Users can insert own pet media" on public.pet_media;
create policy "Users can insert own pet media"
on public.pet_media for insert to authenticated
with check (
  auth.uid()=user_id
  and exists (
    select 1 from public.pets
    where pets.id=pet_media.pet_id and pets.user_id=auth.uid()
  )
);

drop policy if exists "Users can delete own pet media" on public.pet_media;
create policy "Users can delete own pet media"
on public.pet_media for delete to authenticated
using (auth.uid()=user_id);

create index if not exists pet_media_user_id_idx on public.pet_media(user_id);
create index if not exists pet_media_pet_id_idx on public.pet_media(pet_id);
create index if not exists pet_media_created_at_idx on public.pet_media(created_at desc);

drop policy if exists "Users can read own pet-media files" on storage.objects;
create policy "Users can read own pet-media files"
on storage.objects for select to authenticated
using (
  bucket_id='pet-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "Users can upload own pet-media files" on storage.objects;
create policy "Users can upload own pet-media files"
on storage.objects for insert to authenticated
with check (
  bucket_id='pet-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "Users can delete own pet-media files" on storage.objects;
create policy "Users can delete own pet-media files"
on storage.objects for delete to authenticated
using (
  bucket_id='pet-media'
  and (storage.foldername(name))[1]=auth.uid()::text
);
