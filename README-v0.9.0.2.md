# PetAlyze v0.9.0.2 — AI Comic Script

No SQL migration is required.

Install:
1. Copy `app/api/ai/comic-script/route.ts`.
2. Replace `app/comics/[id]/page.tsx`.
3. Restart `npm run dev`.
4. Open the existing comic project.
5. Click `Generate 4-panel script` once.

This version makes one text-model API request. It does not generate images.
The generated 4-panel script is saved into the existing `ai_comic_panels` table.
