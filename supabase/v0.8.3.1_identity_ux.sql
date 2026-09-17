-- PetAlyze v0.8.3.1 — Identity UX Integration
-- Ensures authenticated users can update identity metadata on their own pet media.

drop policy if exists "Users can update own pet media"
on public.pet_media;

create policy "Users can update own pet media"
on public.pet_media
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_media.pet_id
      and pets.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.pets
    where pets.id = pet_media.pet_id
      and pets.user_id = auth.uid()
  )
);
