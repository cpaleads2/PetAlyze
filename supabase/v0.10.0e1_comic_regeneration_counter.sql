-- PetAlyze v0.10.0e1 — persistent comic regeneration counter
begin;

alter table public.ai_comic_panels
  add column if not exists regeneration_count integer not null default 0
  check (regeneration_count >= 0);

comment on column public.ai_comic_panels.regeneration_count is
  'Number of successful image regenerations. Initial image generation does not increment this counter.';

commit;

-- Existing generated panels start at regeneration_count = 0.
-- Therefore their next regeneration is treated as the first regenerate (50% = 4 credits).
