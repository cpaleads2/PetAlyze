-- PetAlyze v0.8.2.2 — Pet Identity Strategy
alter table public.ai_creations
add column if not exists transformation_mode text;

update public.ai_creations
set transformation_mode = 'legacy'
where transformation_mode is null;

create index if not exists ai_creations_transformation_mode_idx
on public.ai_creations(transformation_mode);
