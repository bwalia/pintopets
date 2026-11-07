-- Community votes: /api/v2/pintopets/forum-votes  (CRUD; PintoPets' server enforces who may do what)
local sdk = require("helper.plugin-sdk")

return function(app)
    sdk.crud(app, "/forum-votes", {
        table = "pintopets_forum_votes",
        module = "pintopets_forum_votes",
        fields = {
            target_type = { enum = { "thread", "reply" }, required = true },
            target_uuid = { type = "uuid", required = true },
            user_uuid = { type = "uuid", required = true },
        },
        -- not searchable
        filterable = { "target_type", "target_uuid", "user_uuid" },
        sortable = { "target_type", "created_at", "updated_at" },
        ui = { label = "Community votes", columns = { "target_type", "target_uuid", "user_uuid" } },
    })
end
