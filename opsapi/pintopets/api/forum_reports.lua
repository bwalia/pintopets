-- Community reports: /api/v2/pintopets/forum-reports  (CRUD; PintoPets' server enforces who may do what)
local sdk = require("helper.plugin-sdk")

return function(app)
    sdk.crud(app, "/forum-reports", {
        table = "pintopets_forum_reports",
        module = "pintopets_forum_reports",
        fields = {
            target_type = { enum = { "thread", "reply" }, required = true },
            target_uuid = { type = "uuid", required = true },
            thread_uuid = { type = "uuid", required = true },
            reporter_user_uuid = { type = "uuid", required = true },
            reason = { enum = { "spam", "abuse", "unsafe_advice", "animal_welfare", "off_topic", "other" }, required = true },
            details = { type = "text", max = 1000 },
            status = { enum = { "open", "actioned", "dismissed" } },
            resolved_by_user_uuid = { type = "uuid" },
            resolved_at = { type = "datetime" },
        },
        searchable = { "details" },
        filterable = { "target_type", "target_uuid", "thread_uuid", "reporter_user_uuid", "reason", "status" },
        sortable = { "status", "reason", "created_at", "updated_at" },
        ui = { label = "Community reports", columns = { "target_type", "reason", "status", "created_at" } },
    })
end
