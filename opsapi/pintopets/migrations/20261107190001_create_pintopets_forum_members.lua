-- pintopets_forum_members: one row per person who has used the community.
-- Holds their public community name (never their email) and any suspension.
-- Runs once, inside a transaction. Never edit it after it has been applied —
-- add a new migration file instead.
return function(schema, db)
    db.query([[
        CREATE TABLE IF NOT EXISTS pintopets_forum_members (
            id BIGSERIAL PRIMARY KEY,
            uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
            namespace_id INTEGER NOT NULL REFERENCES namespaces(id) ON DELETE CASCADE,
            user_uuid UUID NOT NULL,
            display_name TEXT NOT NULL,
            suspended_until TIMESTAMPTZ,
            suspension_reason TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT pintopets_forum_members_name_len CHECK (char_length(display_name) BETWEEN 2 AND 40)
        )
    ]])
    db.query("CREATE INDEX IF NOT EXISTS idx_pintopets_forum_members_namespace ON pintopets_forum_members (namespace_id, id DESC)")
    db.query("CREATE UNIQUE INDEX IF NOT EXISTS uq_pintopets_forum_members_user ON pintopets_forum_members (namespace_id, user_uuid)")
    db.query("CREATE UNIQUE INDEX IF NOT EXISTS uq_pintopets_forum_members_name ON pintopets_forum_members (namespace_id, lower(display_name))")
end
