# PetAlyze v0.8.2.2 — Pet Identity Strategy

1. Run `supabase/v0.8.2.2_pet_identity_strategy.sql`.
2. Copy `app/` over the current project with replacement.
3. Restart `npm run dev`.
4. Existing creations are retained and marked Legacy.
5. AI Creation cards are clickable and open Original ↔ AI Result viewer.
6. Viewer supports Download and Delete.
7. New generation modes:
   - Stylize Photo — preserve identity/composition as much as prompt-guided editing allows.
   - Reimagine — more creative freedom.
8. No `input_fidelity` claim is sent to OpenAI or shown to the user.
9. Recommended next test: same dog photo, Stylize Photo + Storybook + Final Medium, exactly once.
