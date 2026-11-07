-- pintopets_forum_mod_actions: append-only audit trail of moderator actions.
-- Runs once, inside a transaction. Never edit it after it has been applied.
return function(schema, db)
    db.query([[
        CREATE TABLE IF NOT EXISTS pintopets_forum_mod_actions (
            id BIGSERIAL PRIMARY KEY,
            uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
            namespace_id INTEGER NOT NULL REFERENCES namespaces(id) ON DELETE CASCADE,
            moderator_user_uuid UUID NOT NULL,
            action TEXT NOT NULL,
            target_type TEXT NOT NULL,
            target_uuid UUID NOT NULL,
            reason TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT pintopets_forum_mod_actions_target CHECK (target_type IN ('thread', 'reply', 'member'))
        )
    ]])
    db.query("CREATE INDEX IF NOT EXISTS idx_pintopets_forum_mod_actions_namespace ON pintopets_forum_mod_actions (namespace_id, id DESC)")
end
