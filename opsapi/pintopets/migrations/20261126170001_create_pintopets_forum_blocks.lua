-- pintopets_forum_blocks: a person (blocker) no longer sees another person's
-- (blocked) community posts. Private to the blocker; the blocked person isn't told.
-- Runs once, inside a transaction. Never edit it after it has been applied.
return function(schema, db)
    db.query([[
        CREATE TABLE IF NOT EXISTS pintopets_forum_blocks (
            id BIGSERIAL PRIMARY KEY,
            uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
            namespace_id INTEGER NOT NULL REFERENCES namespaces(id) ON DELETE CASCADE,
            blocker_user_uuid UUID NOT NULL,
            blocked_user_uuid UUID NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT pintopets_forum_blocks_not_self CHECK (blocker_user_uuid <> blocked_user_uuid)
        )
    ]])
    db.query("CREATE INDEX IF NOT EXISTS idx_pintopets_forum_blocks_namespace ON pintopets_forum_blocks (namespace_id, id DESC)")
    db.query("CREATE UNIQUE INDEX IF NOT EXISTS uq_pintopets_forum_blocks ON pintopets_forum_blocks (namespace_id, blocker_user_uuid, blocked_user_uuid)")
    db.query("CREATE INDEX IF NOT EXISTS idx_pintopets_forum_blocks_blocked ON pintopets_forum_blocks (namespace_id, blocked_user_uuid)")
end
