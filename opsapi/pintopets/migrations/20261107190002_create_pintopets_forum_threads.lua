-- pintopets_forum_threads: community discussions and questions.
-- status: visible | hidden (auto-hidden by reports or a moderator, pending
-- review) | removed (by its author or a moderator; never shown).
-- Runs once, inside a transaction. Never edit it after it has been applied.
return function(schema, db)
    db.query([[
        CREATE TABLE IF NOT EXISTS pintopets_forum_threads (
            id BIGSERIAL PRIMARY KEY,
            uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
            namespace_id INTEGER NOT NULL REFERENCES namespaces(id) ON DELETE CASCADE,
            author_user_uuid UUID NOT NULL,
            category TEXT NOT NULL,
            species TEXT,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            tags TEXT,
            status TEXT NOT NULL DEFAULT 'visible',
            is_locked BOOLEAN NOT NULL DEFAULT FALSE,
            is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
            score INTEGER NOT NULL DEFAULT 0,
            reply_count INTEGER NOT NULL DEFAULT 0,
            accepted_reply_uuid UUID,
            edited_at TIMESTAMPTZ,
            last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT pintopets_forum_threads_status CHECK (status IN ('visible', 'hidden', 'removed')),
            CONSTRAINT pintopets_forum_threads_title_len CHECK (char_length(title) BETWEEN 8 AND 150),
            CONSTRAINT pintopets_forum_threads_body_len CHECK (char_length(body) BETWEEN 1 AND 10000)
        )
    ]])
    db.query("CREATE INDEX IF NOT EXISTS idx_pintopets_forum_threads_namespace ON pintopets_forum_threads (namespace_id, id DESC)")
    db.query("CREATE INDEX IF NOT EXISTS idx_pintopets_forum_threads_activity ON pintopets_forum_threads (namespace_id, status, last_activity_at DESC)")
    db.query("CREATE INDEX IF NOT EXISTS idx_pintopets_forum_threads_author ON pintopets_forum_threads (namespace_id, author_user_uuid, created_at DESC)")
    db.query([[CREATE INDEX IF NOT EXISTS idx_pintopets_forum_threads_search ON pintopets_forum_threads
        USING GIN (to_tsvector('english', title || ' ' || body || ' ' || coalesce(tags, '')))]])
end
