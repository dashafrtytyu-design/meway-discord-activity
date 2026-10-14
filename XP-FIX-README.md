# MEWAY XP fix — 2026-10-11

- Corrected server-side claim ID validation: new Date.now() IDs are 13 digits, while the previous validator allowed only 12. Now permits up to 15 decimal digits.
- XP remains server-authoritative and idempotent; no client XP credit without D1 acknowledgement.
- Large blocking XP banner replaced by a small dismissible diagnostic at the bottom; it appears only on actual errors. The local XP queue is **not deleted** when dismissing.
- Removed only superseded release reports. Curriculum, static assets, migration, tests, code, and XP data handling retained.

## Publish safely
1. Back up existing Cloudflare D1. Never replace or delete D1/KV.
2. Deploy this source to the same Cloudflare project, keeping bindings/secrets.
3. Complete one new 13-digit-ID activity, verify `/api/xp/claim` returns 200 and D1 XP changes once.
4. Reload Activity and verify XP persisted. Check a second device and Discord role.
5. An existing invalid queued claim should be retried automatically at sign-in/online or by the Retry button.

No live Cloudflare/Discord validation has been performed. A successful server write cannot be guaranteed during outages.
