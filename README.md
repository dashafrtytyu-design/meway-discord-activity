# MEWAY Premium Discord Activity

Production-ready MEWAY Activity frontend + Cloudflare Worker/D1 backend.

## Included
- Discord Activity authentication and admin role protection.
- D1-backed missions and content: games, quizzes, word collections, challenges and rewards.
- D1-backed student progress (XP, completed items, MEWAY nickname/avatar).
- Admin builders with CEFR A1–C2, categories, Draft/Published/Archived and working delete endpoints.
- Six game formats: Find Translation, Word Builder (click + drag/drop), Memory Cards, Speed English, Grammar Race, Odd One Out.
- Word collections with Russian, English, transcription, example and image upload.
- Automatic and admin-configurable achievements.
- Responsive desktop/tablet/iOS/Android layout.

## Cloudflare secrets
Keep `DISCORD_CLIENT_SECRET` in Cloudflare only. Never commit it to GitHub.
`wrangler.jsonc` uses `keep_vars: true` so dashboard configuration is preserved.
