# PetAlyze v0.9.0.3 — Comic Panel Image Test
No SQL migration required.

Install:
1. Copy `app/api/ai/comic-panel/route.ts`.
2. Replace `app/comics/[id]/page.tsx`.
3. Restart `npm run dev`.
4. Open the existing script-ready comic.
5. Generate ONLY Panel 1 first.

The route uses the existing Pet Identity Set and the existing `ai-creations` private bucket.
Test mode is 1024x1024, low quality, one image at a time.
