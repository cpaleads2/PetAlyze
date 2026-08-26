# PetAlyze v0.8.1 — Pet Photos + Media Storage

Adds:
- private Supabase Storage bucket `pet-media`
- `pet_media` metadata table
- RLS and Storage access policies
- `/media` Media Library
- JPG / PNG / WebP uploads
- 10 MB file limit
- signed private previews
- optional captions
- delete photo
- Media Library navigation

Setup:
1. Run `supabase/v0.8.1_pet_media.sql` in Supabase SQL Editor.
2. Copy patch files over the current PetAlyze project.
3. Restart `npm run dev`.
4. Open `/media`.
5. Upload one real pet photo.
6. Refresh and confirm the photo remains.
