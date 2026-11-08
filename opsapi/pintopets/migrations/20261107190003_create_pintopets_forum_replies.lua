-- pintopets_forum_replies: answers and comments on a thread.
-- status as for threads: visible | hidden | removed.
-- Runs once, inside a transaction. Never edit it after it has been applied.
return function(schema, db)
    db.query([[
        CREATE TABLE IF NOT EXISTS pintopets_forum_replies (
            id BIGSERIAL PRIMARY KEY,
            uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
            namespace_id INTEGER NOT NULL REFERENCES namespaces(id) ON DELETE CASCADE,
            thread_uuid UUID NOT NULL REFERENCES pintopets_forum_threads(uuid) ON DELETE CASCADE,
            author_user_uuid UUID NOT NULL,
            body TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'visible',
            score INTEGER NOT NULL DEFAULT 0,
            edited_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT pintopets_forum_replies_status CHECK (status IN ('visible', 'hidden', 'removed')),
            CONSTRAINT pintopets_forum_replies_body_len CHECK (char_length(body) BETWEEN 1 AND 10000)
        )
    ]])
    db.query("CREATE INDEX IF NOT EXISTS idx_pintopets_forum_replies_namespace ON pintopets_forum_replies (namespace_id, id DESC)")
    db.query("CREATE INDEX IF NOT EXISTS idx_pintopets_forum_replies_thread ON pintopets_forum_replies (namespace_id, thread_uuid, created_at)")
    db.query("CREATE INDEX IF NOT EXISTS idx_pintopets_forum_replies_author ON pintopets_forum_replies (namespace_id, author_user_uuid, created_at DESC)")
end
