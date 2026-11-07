-- Moderation log: /api/v2/pintopets/forum-mod-actions  (CRUD; PintoPets' server enforces who may do what)
local sdk = require("helper.plugin-sdk")

return function(app)
    sdk.crud(app, "/forum-mod-actions", {
        table = "pintopets_forum_mod_actions",
        module = "pintopets_forum_mod_actions",
        fields = {
            moderator_user_uuid = { type = "uuid", required = true },
            action = { type = "string", required = true, max = 40 },
            target_type = { enum = { "thread", "reply", "member" }, required = true },
            target_uuid = { type = "uuid", required = true },
            reason = { type = "text", max = 500 },
        },
        searchable = { "reason" },
        filterable = { "moderator_user_uuid", "action", "target_type", "target_uuid" },
        sortable = { "action", "created_at", "updated_at" },
        ui = { label = "Moderation log", columns = { "action", "target_type", "target_uuid", "created_at" } },
    })
end
