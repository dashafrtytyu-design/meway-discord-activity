# MEWAY publication repair

- POST uses stable client-created numeric ID and INSERT OR IGNORE, so retry after a lost response cannot create a duplicate for the same editor session.
- D1 write is verified with SELECT before success is returned.
- GET /api/admin/content/:id/verify is admin-protected and used after network uncertainty.
- API errors include code, HTTP status, requestId (server logs use requestId); never expose tokens.
- Revision/notification errors no longer falsely report a failed D1 write.
- No destructive migrations. Keep existing D1 and KV bindings.
- Discord-hosted HTTP 413 on screenshot is not evidence that /api/admin/content returned 413.
- Full live Discord/Cloudflare integration is still required. Verify published items on a separate student account.
