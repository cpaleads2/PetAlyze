create table if not exists public.ai_comics (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 pet_id uuid not null references public.pets(id) on delete cascade, title text not null,
 source_text text, tone text not null default 'heartwarming', panel_count integer not null default 4,
 status text not null default 'draft', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ai_comic_panels (
 id uuid primary key default gen_random_uuid(), comic_id uuid not null references public.ai_comics(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, panel_number integer not null,
 scene_text text, caption text, dialogue text, storage_path text, mime_type text, created_at timestamptz not null default now(),
 unique(comic_id,panel_number)
);
alter table public.ai_comics enable row level security;
alter table public.ai_comic_panels enable row level security;
drop policy if exists "comic select" on public.ai_comics;
create policy "comic select" on public.ai_comics for select to authenticated using(auth.uid()=user_id);
drop policy if exists "comic insert" on public.ai_comics;
create policy "comic insert" on public.ai_comics for insert to authenticated with check(auth.uid()=user_id and exists(select 1 from public.pets p where p.id=pet_id and p.user_id=auth.uid()));
drop policy if exists "comic update" on public.ai_comics;
create policy "comic update" on public.ai_comics for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "comic delete" on public.ai_comics;
create policy "comic delete" on public.ai_comics for delete to authenticated using(auth.uid()=user_id);
drop policy if exists "panel select" on public.ai_comic_panels;
create policy "panel select" on public.ai_comic_panels for select to authenticated using(auth.uid()=user_id);
drop policy if exists "panel insert" on public.ai_comic_panels;
create policy "panel insert" on public.ai_comic_panels for insert to authenticated with check(auth.uid()=user_id and exists(select 1 from public.ai_comics c where c.id=comic_id and c.user_id=auth.uid()));
drop policy if exists "panel update" on public.ai_comic_panels;
create policy "panel update" on public.ai_comic_panels for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "panel delete" on public.ai_comic_panels;
create policy "panel delete" on public.ai_comic_panels for delete to authenticated using(auth.uid()=user_id);
