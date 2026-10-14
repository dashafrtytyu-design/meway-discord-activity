# MEWAY A1: incident investigation and safety checks

## Confirmed in source code
- `worker.ts` merged **built-in** and `curriculum-content.json` generated word collections with D1 custom content. Those starter collections included demo cards. When D1 custom content was missing, unreadable or not returned, demo cards could be displayed as though they were the user's A1 data.
- `src/App.tsx` had version-sensitive cache refresh paths. A new build could replace cached words with a successful but empty server response; a failed fetch with a cached copy could keep stale data visible. This is a visibility/cache hazard, **not proof of server deletion**.
- `worker.ts` has a `deleted_content` tombstone table; those IDs are hidden in merged content. The D1 table must be inspected to determine whether A1 rows exist, are tombstoned, or are missing.

## Changes
- Bundled/demo word collections are no longer included in public/admin merged word lists. **D1 admin-created word records remain untouched.** Other categories are unchanged.
- A cached word collection is not replaced with an unexplained empty full response during a build-version change. Explicit delta deletions still work.
- Added authenticated read-only `GET /api/admin/content-health`: returns D1 word record counts per level, word counts, image counts, unreadable rows and tombstone counts. No image data or tokens are returned. This can identify whether A1 data is present in the D1 currently bound to the Worker.
- No SQL migration or D1 writes are introduced by this patch.

## Important limits
- This patch cannot determine whether the actual production D1 was deleted or switched. It cannot recover missing photos from a repository ZIP if they existed only in D1.
- The diagnostics report only the **currently bound** D1; compare `database_id` and `database_name` in `wrangler.jsonc` against Cloudflare Dashboard bindings and prior deployment settings. Do not publish credentials.
- Do not import demo data, restore a full old backup over a newer DB, or delete D1.

## Production verification BEFORE repopulating
1. Make a D1 backup/export first. In Cloudflare dashboard inspect the D1 binding and DB identifier for the Worker/Pages project.
2. As admin, open `/api/admin/content-health` with your normal authenticated app session; if not easily possible, use the read-only SQL below in D1 console instead.
3. Read-only SQL: `SELECT id, section, updated_at, substr(data,1,180) AS preview FROM content WHERE section='words' ORDER BY updated_at DESC LIMIT 30;`
4. Read-only SQL: `SELECT id, deleted_at FROM deleted_content WHERE id IN (SELECT id FROM content WHERE section='words') LIMIT 30;`
5. Compare old and new deployment D1 bindings. If old A1 records exist in D1 but are not visible, inspect status, access levels, tombstones and cache. If records are absent, check Cloudflare D1 Time Travel/backups before any restore; do not overwrite newer records.
6. After publishing, create one new A1 test card with image, verify in D1 and student view, reload and clear cache, and test on another device.

## Test scope
Node contract tests validate the source safeguards; they are NOT live D1, Discord or browser integration tests. No guarantee of permanent retention is possible without verified backups and deployment tests.
