-- Community members: /api/v2/pintopets/forum-members  (CRUD; PintoPets' server enforces who may do what)
local sdk = require("helper.plugin-sdk")

return function(app)
    sdk.crud(app, "/forum-members", {
        table = "pintopets_forum_members",
        module = "pintopets_forum_members",
        fields = {
            user_uuid = { type = "uuid", required = true },
            display_name = { type = "string", required = true, min = 2, max = 40 },
            suspended_until = { type = "datetime" },
            suspension_reason = { type = "text", max = 500 },
        },
        searchable = { "display_name" },
        filterable = { "user_uuid", "display_name", "suspended_until" },
        sortable = { "display_name", "suspended_until", "created_at", "updated_at" },
        ui = { label = "Community members", columns = { "display_name", "user_uuid", "suspended_until" } },
    })
end
