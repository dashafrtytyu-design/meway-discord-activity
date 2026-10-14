-- Run only after backing up D1. Existing rows remain unchanged.
CREATE TABLE IF NOT EXISTS xp_operations (user_id TEXT NOT NULL, operation_id TEXT NOT NULL, kind TEXT NOT NULL, item_id TEXT NOT NULL, xp INTEGER NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(user_id,operation_id));
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_once_per_item ON xp_operations(user_id,kind,item_id);
