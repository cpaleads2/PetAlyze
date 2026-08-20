# PetAlyze MVP v0.4 — Real AI Story generation

## What this patch adds
- Server-only OpenAI API integration using the Responses API
- AI-generated title, story and social caption
- AI stories saved to Supabase
- Free-plan server-side limit: 1 successful AI story per calendar month
- Dashboard AI usage counter
- User authentication checked before generation
- OpenAI API key remains server-only

## Setup

### 1. Supabase
Run `supabase/ai_stories.sql` in Supabase SQL Editor.

### 2. OpenAI API key
Add to your existing `.env.local`:

OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6-luna

Do not use NEXT_PUBLIC_ for the OpenAI key.

### 3. Install
npm install

### 4. Restart
npm run dev

### 5. Test
Open `/ai-story`, select a pet, enter a real memory and generate.

On success:
- story appears on the page
- story is persisted in Supabase
- Dashboard changes AI stories this month from 0 / 1 to 1 / 1
- a second generation in the same calendar month is blocked server-side
