# MEWAY — local-first XP queue

## Implemented
- IndexedDB XP outbox keyed by Discord user ID and unique operation ID.
- Import of pre-existing localStorage queues; localStorage recovery mirror retained.
- Queue is committed locally before sending; acknowledged items removed only after server returns `ok` and authoritative `progress`.
- Reconnect and next authenticated launch retry pending items; no timer-based polling.
- No changes to CSS, curriculum JSON, UI navigation or Cloudflare bindings.
- D1 remains authoritative for confirmed XP; existing server idempotency remains in place.

## Limitations
- A queue saved only on one device can be lost if all site data is cleared before server acknowledgement.
- Not all activity types have server-verifiable evidence; games and non-graded content still depend on client completion.
- Operations are sent individually, not in an HTTP batch, to preserve existing D1 API semantics.
- Existing localStorage profile persistence is unchanged; this update focuses on XP outbox.
- Live Discord, Cloudflare, multi-device integration and production build are not verified.
