-- Community blocks: /api/v2/pintopets/forum-blocks  (CRUD; PintoPets' server enforces who may do what)
local sdk = require("helper.plugin-sdk")

return function(app)
    sdk.crud(app, "/forum-blocks", {
        table = "pintopets_forum_blocks",
        module = "pintopets_forum_blocks",
        fields = {
            blocker_user_uuid = { type = "uuid", required = true },
            blocked_user_uuid = { type = "uuid", required = true },
        },
        -- not searchable
        filterable = { "blocker_user_uuid", "blocked_user_uuid" },
        sortable = { "created_at", "updated_at" },
        ui = { label = "Community blocks", columns = { "blocker_user_uuid", "blocked_user_uuid", "created_at" } },
    })
end
