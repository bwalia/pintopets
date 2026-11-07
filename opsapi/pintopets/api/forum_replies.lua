-- Community replies: /api/v2/pintopets/forum-replies  (CRUD; PintoPets' server enforces who may do what)
local sdk = require("helper.plugin-sdk")

return function(app)
    sdk.crud(app, "/forum-replies", {
        table = "pintopets_forum_replies",
        module = "pintopets_forum_replies",
        fields = {
            thread_uuid = { type = "uuid", required = true },
            author_user_uuid = { type = "uuid", required = true },
            body = { type = "text", required = true, min = 1, max = 10000 },
            status = { enum = { "visible", "hidden", "removed" } },
            score = { type = "integer", min = 0 },
            edited_at = { type = "datetime" },
        },
        searchable = { "body" },
        filterable = { "thread_uuid", "author_user_uuid", "status" },
        sortable = { "score", "created_at", "updated_at" },
        ui = { label = "Community replies", columns = { "thread_uuid", "author_user_uuid", "status", "score" } },
    })
end
