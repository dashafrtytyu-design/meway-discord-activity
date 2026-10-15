# MEWAY V7.31.23 — XP transactional safety patch

- Atomic claim checks legacy completed arrays before inserting an XP operation.
- New student XP records initialize at 0, never at an invented starting balance.
- Existing D1 XP and completion arrays remain authoritative and untouched by ordinary profile saves.
- The browser queue only acknowledges claims after a successful response with a server progress snapshot.
- Confirmed progress is also cached locally; operation IDs use crypto.randomUUID.
- Recovery does not fall back to another Discord user’s cached progress.

## Deployment
Back up production D1 before changes. Deploy Worker and frontend together. Do not delete existing progress or run destructive migrations. The existing xp_operations table and index are initialized by ensureDb; existing migration SQL remains included for review. Verify with a staging D1 before production.

## Known limits
Server currently checks the item ID and award but not a cryptographically verifiable answer/completion proof. Never claim it is cheat-proof. Browser-local unconfirmed XP cannot survive deliberate clearing of the only local copy. Live Discord/D1 integration is not verified.
