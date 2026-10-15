# MEWAY — targeted XP claim fix (2026-10-15)

## Confirmed from browser
POST /api/xp/claim returns HTTP 404 with `{ "ok": false, "error": "Unknown learning item." }` for kind `content`, itemId `1791915015353719` and `answers: []`.

## Changes
- Worker XP claim now uses one direct D1 row lookup by ID for content/mission instead of loading *every* content section into Worker memory.
- If not in D1, looks up built-in/generated curriculum by ID without loading all D1 content.
- Unknown items still get 404 (no fabricated XP); response now includes diagnostic `code`, `hint`, `itemId`, `kind`.
- No database schema changes, deletion, or migration.

## Important limitations
- The referenced ID was not found in the source ZIP's generated curriculum text; whether it exists in production D1 is unknown. If it does not exist in production D1, the 404 is expected. The activity must be properly saved/published to the same D1 binding, not blindly credited.
- Quiz/challenge proportional XP logic was already present in this source and remains unchanged.
- Games currently send empty answers and do not provide server-verifiable proportional scoring; that feature is NOT fixed by this patch.
- Word images were removed in production D1 according to screenshots, but this ZIP does not remove cached images on users' devices. No photo deletion was performed.
- `node --test tests/*.test.mjs`: 52 passing; production build not verified: npm dependencies incomplete (`vite/client`, `node` types missing). Do not deploy as a fully validated final build without a successful build and staging test.
