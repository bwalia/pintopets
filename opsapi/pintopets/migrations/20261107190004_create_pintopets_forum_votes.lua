-- pintopets_forum_votes: one "helpful" vote per person per thread or reply.
-- Runs once, inside a transaction. Never edit it after it has been applied.
return function(schema, db)
    db.query([[
        CREATE TABLE IF NOT EXISTS pintopets_forum_votes (
            id BIGSERIAL PRIMARY KEY,
            uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
            namespace_id INTEGER NOT NULL REFERENCES namespaces(id) ON DELETE CASCADE,
            target_type TEXT NOT NULL,
            target_uuid UUID NOT NULL,
            user_uuid UUID NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT pintopets_forum_votes_target CHECK (target_type IN ('thread', 'reply'))
        )
    ]])
    db.query("CREATE INDEX IF NOT EXISTS idx_pintopets_forum_votes_namespace ON pintopets_forum_votes (namespace_id, id DESC)")
    db.query("CREATE UNIQUE INDEX IF NOT EXISTS uq_pintopets_forum_votes ON pintopets_forum_votes (namespace_id, target_type, target_uuid, user_uuid)")
    db.query("CREATE INDEX IF NOT EXISTS idx_pintopets_forum_votes_user ON pintopets_forum_votes (namespace_id, user_uuid, created_at DESC)")
end
