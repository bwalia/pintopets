-- pintopets_forum_reports: people flagging a thread or reply for moderators.
-- status: open | actioned | dismissed.
-- Runs once, inside a transaction. Never edit it after it has been applied.
return function(schema, db)
    db.query([[
        CREATE TABLE IF NOT EXISTS pintopets_forum_reports (
            id BIGSERIAL PRIMARY KEY,
            uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
            namespace_id INTEGER NOT NULL REFERENCES namespaces(id) ON DELETE CASCADE,
            target_type TEXT NOT NULL,
            target_uuid UUID NOT NULL,
            thread_uuid UUID NOT NULL REFERENCES pintopets_forum_threads(uuid) ON DELETE CASCADE,
            reporter_user_uuid UUID NOT NULL,
            reason TEXT NOT NULL,
            details TEXT,
            status TEXT NOT NULL DEFAULT 'open',
            resolved_by_user_uuid UUID,
            resolved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT pintopets_forum_reports_target CHECK (target_type IN ('thread', 'reply')),
            CONSTRAINT pintopets_forum_reports_status CHECK (status IN ('open', 'actioned', 'dismissed'))
        )
    ]])
    db.query("CREATE INDEX IF NOT EXISTS idx_pintopets_forum_reports_namespace ON pintopets_forum_reports (namespace_id, id DESC)")
    db.query("CREATE INDEX IF NOT EXISTS idx_pintopets_forum_reports_open ON pintopets_forum_reports (namespace_id, status, created_at)")
    db.query("CREATE UNIQUE INDEX IF NOT EXISTS uq_pintopets_forum_reports_once ON pintopets_forum_reports (namespace_id, target_type, target_uuid, reporter_user_uuid)")
end
