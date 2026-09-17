-- PetAlyze v0.9.0.7 — Comic Source Photo
alter table public.ai_comics
  add column if not exists source_media_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_comics_source_media_id_fkey'
  ) then
    alter table public.ai_comics
      add constraint ai_comics_source_media_id_fkey
      foreign key (source_media_id)
      references public.pet_media(id)
      on delete set null;
  end if;
end $$;

create index if not exists ai_comics_source_media_id_idx
  on public.ai_comics(source_media_id);
