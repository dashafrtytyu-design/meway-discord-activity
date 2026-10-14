# MEWAY — image persistence verification (2026-10-14)

## Actual storage architecture
- Material images are resized in the browser and encoded as WebP (or PNG fallback) data URLs.
- Images are embedded in the material's `payload` JSON and stored in the Cloudflare D1 `content.data` column. They are **not** stored only in IndexedDB.
- Existing data URLs remain intact on load/edit; images are not separately uploaded to R2.
- Server rejects requests above 12,000,000 characters; browser currently rejects image data URLs above 850,000 characters and original files over 20 MiB. Unlimited image size/count is not supported.

## Changes in this ZIP
- All image upload paths in the visual prototype, game editor, and vocabulary editor are tracked as pending conversions.
- Save waits for image conversion to complete before creating the snapshot sent to the API. If image conversion fails, save is stopped and the editor displays an error.
- Editor maintains a synchronous latest-value reference to prevent saving a stale React closure when an image finishes processing.
- Existing D1 read-back verification and material history are preserved.
- No database schema changes, deletion, or XP changes.

## Tests actually run
- `node --test tests/*.test.mjs`: 55 passed (many are static/source-contract tests; not end-to-end).
- `npm run build`: blocked because local `vite/client` and `node` type packages are not installed.
- **Not tested**: real Cloudflare D1 write/read, live Discord re-login, cross-device restore, actual image restoration after cache clear, full UI/browser tests, production deployment.

## Mandatory live acceptance before bulk upload
1. Export full D1 backup (Cloudflare dashboard/database backup), and download full MEWAY JSON export. Preserve both outside the browser.
2. Deploy to a staging project with a copy of the database if possible. Never test destructive operations on the only production copy.
3. Publish one A1 word with a transparent PNG, verify a success response and read the item back using the admin verification API; compare image data URL and card text.
4. Reload, sign out/in, test another browser/device and clear local site data; check the same image and text still appear.
5. Replace the image while changing the text; save, reload and verify both changes. Remove image, save, reload and verify text remains.
6. Simulate a network failure; verify the editor does not claim publication and keeps unsaved edits. Retry and check exactly one server record exists.
7. Test a game image and an image added through the visual prototype editor; verify the same recovery sequence.
8. Export backup again and verify the JSON contains the images for the test cards. Test restoration in a separate D1 database, not the production database.
9. Confirm student visibility and access filtering on a different Discord account.

Do **not** begin bulk entry until live D1 read/write and cache-cleared restoration pass. No software can guarantee absolute preservation without monitored backups and restore drills.
