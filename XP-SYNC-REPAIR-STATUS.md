# XP sync repair (2026-10-11)

- Added HTTP status and safe server error details to XP pending banner; no tokens shown.
- Failed XP claims stay in IndexedDB and localStorage mirror; only acknowledged after confirmed `ok` and `progress` response.
- Queue processes claims sequentially and drains newly queued operations when a send is already in progress.
- Retry on reconnection or explicit click, without polling or new background timers.
- Cloudflare D1 remains authoritative. No fake local XP award or suppressed pending state.
- `node --test tests/*.test.mjs`: 38/38 pass (source-level contract tests, not live integration).
- `tsc -b`: blocked by missing `vite/client` and `@types/node` packages in this environment.
- Live Discord/D1 XP save, role sync, and API HTTP 422/500 causes still require deployment testing.

If the pending banner shows HTTP 422, inspect the error: the server may reject incomplete/invalid answer transcripts or a missing/unpublished item. HTTP 401 requires a fresh Discord login; HTTP 500 requires Cloudflare Worker logs. Do not delete pending local claims before reconciliation.

Deploy: backup existing D1 and project; deploy code only without resetting DB/KV; complete one published mission, confirm XP increases after server response, close/reopen on a second device, and verify Discord role sync.
