# PetAlyze v0.8.3.0 — Pet Identity Foundation

Incremental patch for v0.8.2.2.

1. Run `supabase/v0.8.3.0_pet_identity_foundation.sql` in Supabase SQL Editor.
2. Copy/merge `app/` into the current project.
3. Restart `npm run dev`.
4. Open `/pets/<PET_ID>/identity`.

This version reuses existing private pet photos and adds Identity Set roles.
It makes no OpenAI calls and does not change the v0.8.2.2 generation route yet.
The next patch will connect Identity Set navigation to Pet Profile and Media Library.
