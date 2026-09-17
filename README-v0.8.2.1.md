# PetAlyze v0.8.2.1 — Identity Preservation + Quality Modes

Changes:
- input_fidelity=high for image edits
- much stronger identity-preservation prompt
- original pose/accessories/composition preserved by default
- Preview / Final / Premium output modes
- low / medium / high OpenAI image quality
- Final (medium) is the new default
- input fidelity recorded in ai_creations

Recommended test:
1. Run the SQL migration.
2. Install patch.
3. Restart the dev server.
4. Use the SAME dog photo as the previous test.
5. Select Storybook + Final — Medium.
6. Generate exactly one image and compare it side-by-side with the original.
