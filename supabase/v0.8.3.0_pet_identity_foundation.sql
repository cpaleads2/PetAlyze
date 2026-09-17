-- PetAlyze v0.8.3.0 — Pet Identity Foundation
alter table public.pet_media add column if not exists identity_role text;
alter table public.pet_media add column if not exists identity_priority integer;

alter table public.pet_media drop constraint if exists pet_media_identity_role_check;
alter table public.pet_media add constraint pet_media_identity_role_check
check (identity_role is null or identity_role in ('primary','face','profile','full_body','additional'));

alter table public.pet_media drop constraint if exists pet_media_identity_priority_check;
alter table public.pet_media add constraint pet_media_identity_priority_check
check (identity_priority is null or identity_priority between 1 and 100);

create index if not exists pet_media_pet_identity_idx
on public.pet_media(pet_id,identity_role,identity_priority);

create unique index if not exists pet_media_one_primary_identity_per_pet
on public.pet_media(pet_id) where identity_role='primary';
