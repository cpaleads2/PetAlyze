# PetAlyze v0.8.2 — AI Illustration

Adds:
- generic `ai_creations` table for illustration now and comic/video/book later
- private Supabase bucket `ai-creations`
- `/ai-illustration` AI Creative Studio
- Media Library → Create AI Illustration
- server-only OpenAI image edit request
- GPT-Image-2
- 1024×1024 / Low quality test mode
- Storybook / Watercolor / Cute 3D / Cinematic Portrait
- generated image saved permanently in Supabase
- source photo is never overwritten

Setup:
1. Run `supabase/v0.8.2_ai_creations.sql` in Supabase SQL Editor.
2. Copy patch files over the current project.
3. Existing `.env.local` already contains `OPENAI_API_KEY`.
4. Optional: add `OPENAI_IMAGE_MODEL=gpt-image-2` to `.env.local`.
5. Restart `npm run dev`.
6. Open Media Library.
7. Click `Create AI Illustration` on one saved photo.
8. Generate exactly one Low-quality test image first.
