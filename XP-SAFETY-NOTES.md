# XP safety V7.31.22
Confirmed XP is stored in D1. Ordinary profile PUT merges fields into current server record and cannot overwrite XP or completed arrays. XP claims have an idempotency key and per-item uniqueness. The client shows XP as pending until acknowledgement and queues claims in localStorage. Retry occurs on online event or a user action; no timers. A cleared browser store can still lose claims that were never confirmed.

**Deployment**: Back up D1 first. Review/run MIGRATION-XP-SAFETY.sql before deploying Worker. Existing xp_operations duplicates for the same (user_id,kind,item_id), if any, must be resolved before unique index creation. Validate real Discord and D1 transactions on staging.

**Limitations**: Other game/placement XP paths and stats require independent end-to-end verification; offline queue is not a substitute for a server acknowledgement. A claim currently validates an item ID, not a trusted graded answer, so it must not be considered cheat-proof.
