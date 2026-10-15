# MEWAY XP reliability — implementation status

Changes made to existing release-candidate source:
- Server-authoritative daily reward: requires a threshold of confirmed activity ledger entries on the UTC date; never trusts client daily counters; award is idempotent by `(user_id, kind, item_id)`.
- Client daily reward now uses the existing durable per-account XP queue and does not display speculative XP.
- Pending queue is retried when authenticated after reopening the app and on reconnection.
- XP role outbox records outstanding synchronization requests and failures, preserving the six XP-role IDs and leaving unrelated Discord roles untouched.
- Mission/content ledger and conditional D1 batch logic retained; admin XP restoration audit retained.

## IMPORTANT remaining limitations (not production-certified)
- Mission/quiz correct answers are still delivered to the client in existing content. A modified client can forge a transcript. Server-issued attempt IDs and hidden answer keys are needed for strong anti-cheat.
- Non-graded games/words/content still accept a completion assertion from the client. They are idempotent but not server-verifiable. A trusted attempt protocol must be built per activity type.
- The daily `answers` metric is conservatively interpreted as *completed, server-confirmed activities*, not individual answer clicks. This may require more work than the UI indicates; align UI/goal semantics before release.
- Streak milestones and other potential XP sources have not been fully migrated to an authoritative ledger; check all awarding paths before release.
- Role outbox records failures, but an automatic retry worker/cron is not implemented; a new successful claim or manual admin sync is not guaranteed to drain prior failures.
- D1 backups and full restore verification are not implemented by this patch. Do not perform destructive migrations.
- Real two-device, Discord OAuth/API, Cloudflare D1/KV, offline recovery and concurrent-request integration tests have not been run.
- TypeScript/Vite build is blocked by missing `vite/client` and `node` dependency types.

No CSS, image or curriculum JSON files were edited.
