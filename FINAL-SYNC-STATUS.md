# MEWAY — sync update on V7.31.24 base

This archive contains the original project plus changes in `worker.ts`, `src/discord.ts`, `src/App.tsx`, and `tests/sync-contract.test.mjs`. It is not a certified production build.

## Implemented
- Cached Discord session uses one authenticated `/api/progress-signal` Worker request that reads two per-user KV signals (access and progress), instead of separate access and progress signal HTTP calls. This is NOT zero requests: detecting remote changes requires a signal.
- On a changed/missing progress signal, the app requests `/api/progress` from D1, refreshes the cached auth snapshot, and updates its local progress. With an unchanged signal it avoids that D1 read.
- Successful new XP claims, profile saves, admin XP restoration and first registration publish a progress invalidation signal to KV (best-effort; D1 is authoritative).
- Access grants continue publishing KV signals and are applied on the next cached login. Existing levels are preserved according to the admin-supplied levels array.
- Existing Home catalog and interface retained; initial OAuth may still read multiple D1 tables.
- Default XP for new GET progress fallback corrected from 120 to 0.

## Important limitations
- KV signals are eventually consistent. Immediately after a change another device may temporarily display stale state. Real-time identical state with zero network calls is impossible.
- Missing/unavailable KV: fallback recovery uses D1 when a missing signal is returned; if the KV service itself fails, the cached state may remain stale until next successful sync.
- `ensureDb()` performs schema DDL on a cold isolate, not zero D1 work.
- XP completion is not cryptographically verified: the server validates published item, access and one-time claim but does not independently grade all task answers. Do not treat the XP economy as cheat-proof.
- Offline unconfirmed XP may be lost if browser storage is cleared. Do not delete D1 data or apply destructive migrations.
- Client caches are not authoritative. Test account switching, KV propagation, concurrent XP, admin access changes, Discord role permissions and Cloudflare quotas before production.
- This package contains SOURCE, not a verified production `dist` bundle.

## Checks
- `node --test tests/sync-contract.test.mjs`: six source-contract checks pass. These are static source checks, not integration tests.
- `node --check scripts/verify-production.mjs` and `node --check scripts/generate-build-version.mjs`: pass.
- `tsc -b`: blocked by missing `vite/client` and `node` type definitions (`node_modules` absent). Vite build not executed.

## External verification
1. Backup D1 and test with separate Discord test accounts and devices.
2. Grant A1 then A2 in admin UI, verify KV signal and authorized content visibility, including revocation.
3. Award XP on phone and reopen desktop, confirm D1 and KV revision update and Discord XP role.
4. Simulate offline queue, retry, duplicate operation, concurrent requests, KV outages and Worker/D1 quota errors.
5. Install dependencies, run `npm run build`, inspect production output, then test on Cloudflare preview before release.
