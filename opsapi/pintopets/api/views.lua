-- Read views PintoPets' server needs in one round trip each. Everything else
-- (create/update/delete and single-resource reads) uses the generated CRUD
-- routes. Both views are workspace-scoped: every table is filtered by
-- namespace_id, as PLUGINS.md §5.2 requires for hand-written SQL.
--
--   GET /api/v2/pintopets/users/:user_uuid/pets?status=&pet_uuid=
--       The user's pets (via pet-members) with their role, latest weight and
--       profile photo description.
--   GET /api/v2/pintopets/users/:user_uuid/due?pet_uuid=
--       Every record that can carry a due date, for the user's active pets.
--       PintoPets picks the latest entry per series and the reminder window.
local sdk = require("helper.plugin-sdk")

local UUID = "^%x%x%x%x%x%x%x%x%-%x%x%x%x%-%x%x%x%x%-%x%x%x%x%-%x%x%x%x%x%x%x%x%x%x%x%x$"
local STATUSES = { active = true, archived = true, deceased = true }

local function uuid_param(value)
    if value == nil or value == "" then return "" end
    if type(value) ~= "string" or not value:match(UUID) then return nil end
    return value:lower()
end

return function(app)
    app:get("/users/:user_uuid/pets", sdk.handler({ permission = "pintopets_pets.read" }, function(self)
        local user = uuid_param(self.params.user_uuid)
        local pet = uuid_param(self.params.pet_uuid)
        local status = self.params.status or ""
        if not user or user == "" or not pet or (status ~= "" and not STATUSES[status]) then
            return sdk.error(400, "user_uuid and pet_uuid must be UUIDs; status active|archived|deceased")
        end
        local ns = sdk.namespace_id(self)
        local rows = sdk.db.query([[
            SELECT p.*, m.role AS my_role,
                   w.weight_grams AS latest_weight_grams, w.measured_on AS latest_weight_on,
                   ph.alt_text AS profile_photo_alt
              FROM pintopets_pet_members m
              JOIN pintopets_pets p ON p.uuid = m.pet_uuid AND p.namespace_id = m.namespace_id
              LEFT JOIN LATERAL (
                    SELECT weight_grams, measured_on FROM pintopets_weights x
                     WHERE x.pet_uuid = p.uuid AND x.namespace_id = p.namespace_id
                     ORDER BY measured_on DESC, created_at DESC LIMIT 1) w ON TRUE
              LEFT JOIN pintopets_photos ph ON ph.uuid = p.profile_photo_uuid AND ph.namespace_id = p.namespace_id
             WHERE m.namespace_id = ? AND m.user_uuid = ?::uuid
               AND (? = '' OR p.status = ?)
               AND (? = '' OR p.uuid = NULLIF(?, '')::uuid)
             ORDER BY lower(p.name), p.created_at
        ]], ns, user, status, status, pet, pet)
        return sdk.ok(sdk.array(rows))
    end))

    app:get("/users/:user_uuid/due", sdk.handler({ permission = "pintopets_pets.read" }, function(self)
        local user = uuid_param(self.params.user_uuid)
        local pet = uuid_param(self.params.pet_uuid)
        if not user or user == "" or not pet then
            return sdk.error(400, "user_uuid and pet_uuid must be UUIDs")
        end
        local ns = sdk.namespace_id(self)
        local rows = sdk.db.query([[
            WITH pets AS (
                SELECT p.uuid, p.name
                  FROM pintopets_pet_members m
                  JOIN pintopets_pets p ON p.uuid = m.pet_uuid AND p.namespace_id = m.namespace_id
                 WHERE m.namespace_id = ? AND m.user_uuid = ?::uuid AND p.status = 'active'
                   AND (? = '' OR p.uuid = NULLIF(?, '')::uuid)
            )
            SELECT 'vaccination' AS kind, r.uuid AS record_uuid, r.pet_uuid, pets.name AS pet_name,
                   r.vaccine AS series, r.vaccine AS label, r.given_on AS done_on, r.next_due_on AS due_on
              FROM pintopets_vaccinations r JOIN pets ON pets.uuid = r.pet_uuid WHERE r.namespace_id = ?
            UNION ALL
            SELECT 'parasite_treatment', r.uuid, r.pet_uuid, pets.name, r.kind, r.kind, r.given_on, r.next_due_on
              FROM pintopets_parasite_treatments r JOIN pets ON pets.uuid = r.pet_uuid WHERE r.namespace_id = ?
            UNION ALL
            SELECT 'horse_care', r.uuid, r.pet_uuid, pets.name, r.kind, r.kind, r.done_on, r.next_due_on
              FROM pintopets_horse_cares r JOIN pets ON pets.uuid = r.pet_uuid WHERE r.namespace_id = ?
            UNION ALL
            SELECT 'medication_end', r.uuid, r.pet_uuid, pets.name, r.uuid::text, r.name, r.start_on, r.end_on
              FROM pintopets_medications r JOIN pets ON pets.uuid = r.pet_uuid
             WHERE r.namespace_id = ? AND r.reminders_enabled IS NOT FALSE
            UNION ALL
            SELECT 'vet_follow_up', r.uuid, r.pet_uuid, pets.name, 'vet-follow-up', r.reason, r.visit_on, r.follow_up_on
              FROM pintopets_vet_visits r JOIN pets ON pets.uuid = r.pet_uuid WHERE r.namespace_id = ?
        ]], ns, user, pet, pet, ns, ns, ns, ns, ns)
        return sdk.ok(sdk.array(rows))
    end))

    sdk.doc(app, "GET /users/:user_uuid/pets", {
        summary = "A user's pets with role, latest weight and profile photo",
        permission = "pintopets_pets.read",
        path = { user_uuid = { type = "string", format = "uuid" } },
        query = {
            status = { type = "string", enum = { "active", "archived", "deceased" } },
            pet_uuid = { type = "string", format = "uuid" },
        },
        response = { type = "array", items = { type = "object", additionalProperties = true } },
    })
    sdk.doc(app, "GET /users/:user_uuid/due", {
        summary = "Records with due dates for a user's active pets (reminders)",
        permission = "pintopets_pets.read",
        path = { user_uuid = { type = "string", format = "uuid" } },
        query = { pet_uuid = { type = "string", format = "uuid" } },
        response = { type = "array", items = { type = "object", additionalProperties = true } },
    })
end
