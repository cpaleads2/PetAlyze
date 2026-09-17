# PetAlyze v0.8.3.1 — Identity UX Integration

What changes:
- Pet Profile now shows Photos, Identity refs and Vaccinations.
- Pet Profile has an Identity Set button and dedicated Pet Identity card.
- Media Library shows Identity role badges.
- Every media card links directly to that pet's Identity Set.
- Includes the missing secure UPDATE RLS policy for pet_media.

Install:
1. Run `supabase/v0.8.3.1_identity_ux.sql` in Supabase SQL Editor.
2. Copy the `app/` folder over the project with replacement/merge.
3. Restart `npm run dev`.
4. Open a Pet Profile and confirm the Identity Set button is visible.
5. Open Media Library and confirm the Primary identity badge appears on the selected real pet photo.

No OpenAI generation is performed by this patch.
