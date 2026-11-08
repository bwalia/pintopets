-- Community threads: /api/v2/pintopets/forum-threads  (CRUD; PintoPets' server enforces who may do what)
local sdk = require("helper.plugin-sdk")

return function(app)
    sdk.crud(app, "/forum-threads", {
        table = "pintopets_forum_threads",
        module = "pintopets_forum_threads",
        fields = {
            author_user_uuid = { type = "uuid", required = true },
            category = { type = "string", required = true, max = 40 },
            species = { type = "string", max = 60 },
            title = { type = "string", required = true, min = 8, max = 150 },
            body = { type = "text", required = true, min = 1, max = 10000 },
            tags = { type = "string", max = 200 },
            status = { enum = { "visible", "hidden", "removed" } },
            is_locked = { type = "boolean" },
            is_pinned = { type = "boolean" },
            score = { type = "integer", min = 0 },
            reply_count = { type = "integer", min = 0 },
            accepted_reply_uuid = { type = "uuid" },
            edited_at = { type = "datetime" },
            last_activity_at = { type = "datetime" },
        },
        searchable = { "title", "body", "tags" },
        filterable = { "author_user_uuid", "category", "species", "status", "is_locked", "is_pinned" },
        sortable = { "last_activity_at", "score", "reply_count", "created_at", "updated_at" },
        ui = { label = "Community threads", columns = { "title", "category", "status", "reply_count", "score" } },
    })
end
