-- PintoPets — OpsAPI plugin manifest (guide: PLUGINS.md in the opsapi repo)
return {
    code = "pintopets",          -- stable id: keys migrations + RBAC; never rename
    name = "PintoPets",
    version = "0.2.0",
    description = "Pet records, health history, reminders and a community forum for PintoPets (pintopets.app)",
    sdk_version = 1,            -- helper.plugin-sdk version this plugin targets

    -- RBAC modules. On first install admin/owner roles get "manage"; grant
    -- them to other roles from the dashboard's role settings.
    modules = {
        { machine_name = "pintopets_pets", name = "Pets", category = "PintoPets" },
        { machine_name = "pintopets_pet_members", name = "Pet members", category = "PintoPets" },
        { machine_name = "pintopets_weights", name = "Weights", category = "PintoPets" },
        { machine_name = "pintopets_vaccinations", name = "Vaccinations", category = "PintoPets" },
        { machine_name = "pintopets_parasite_treatments", name = "Flea, worm and tick", category = "PintoPets" },
        { machine_name = "pintopets_medications", name = "Medicines", category = "PintoPets" },
        { machine_name = "pintopets_vet_visits", name = "Vet visits", category = "PintoPets" },
        { machine_name = "pintopets_conditions", name = "Conditions", category = "PintoPets" },
        { machine_name = "pintopets_allergies", name = "Allergies", category = "PintoPets" },
        { machine_name = "pintopets_symptoms", name = "Symptom diary", category = "PintoPets" },
        { machine_name = "pintopets_horse_cares", name = "Horse care", category = "PintoPets" },
        { machine_name = "pintopets_diet_items", name = "Diet", category = "PintoPets" },
        { machine_name = "pintopets_diet_changes", name = "Diet changes", category = "PintoPets" },
        { machine_name = "pintopets_water_notes", name = "Water intake", category = "PintoPets" },
        { machine_name = "pintopets_photos", name = "Photos", category = "PintoPets" },
        { machine_name = "pintopets_account_settings", name = "Account security", category = "PintoPets" },
        { machine_name = "pintopets_forum_members", name = "Community members", category = "PintoPets Community" },
        { machine_name = "pintopets_forum_threads", name = "Community threads", category = "PintoPets Community" },
        { machine_name = "pintopets_forum_replies", name = "Community replies", category = "PintoPets Community" },
        { machine_name = "pintopets_forum_votes", name = "Community votes", category = "PintoPets Community" },
        { machine_name = "pintopets_forum_reports", name = "Community reports", category = "PintoPets Community" },
        { machine_name = "pintopets_forum_mod_actions", name = "Moderation log", category = "PintoPets Community" },
        -- opsapi:modules (make:resource adds entries above this line)
    },

    -- Custom dashboard pages (ui/*.html), shown in a sandboxed frame and
    -- calling this plugin's API through the page bridge (PLUGINS.md §6.2).
    pages = {
        -- opsapi:pages (make:page adds entries above this line)
    },

    -- Dashboard sidebar: each entry opens a generated list/form page for an
    -- sdk.crud resource, or a custom page. icon = a Lucide icon name (see PLUGINS.md).
    menu = {
        { label = "Pets", resource = "pets", module = "pintopets_pets", icon = "PawPrint" },
        { label = "Pet members", resource = "pet-members", module = "pintopets_pet_members", icon = "Users" },
        { label = "Weights", resource = "weights", module = "pintopets_weights", icon = "Scale" },
        { label = "Vaccinations", resource = "vaccinations", module = "pintopets_vaccinations", icon = "Syringe" },
        { label = "Flea, worm and tick", resource = "parasite-treatments", module = "pintopets_parasite_treatments", icon = "Bug" },
        { label = "Medicines", resource = "medications", module = "pintopets_medications", icon = "Pill" },
        { label = "Vet visits", resource = "vet-visits", module = "pintopets_vet_visits", icon = "Stethoscope" },
        { label = "Conditions", resource = "conditions", module = "pintopets_conditions", icon = "HeartPulse" },
        { label = "Allergies", resource = "allergies", module = "pintopets_allergies", icon = "TriangleAlert" },
        { label = "Symptom diary", resource = "symptoms", module = "pintopets_symptoms", icon = "NotebookPen" },
        { label = "Horse care", resource = "horse-cares", module = "pintopets_horse_cares", icon = "Hammer" },
        { label = "Diet", resource = "diet-items", module = "pintopets_diet_items", icon = "Apple" },
        { label = "Diet changes", resource = "diet-changes", module = "pintopets_diet_changes", icon = "ArrowLeftRight" },
        { label = "Water intake", resource = "water-notes", module = "pintopets_water_notes", icon = "Droplets" },
        { label = "Photos", resource = "photos", module = "pintopets_photos", icon = "Image" },
        { label = "Account security", resource = "account-settings", module = "pintopets_account_settings", icon = "ShieldCheck" },
        { label = "Community members", resource = "forum-members", module = "pintopets_forum_members", icon = "UserRound" },
        { label = "Community threads", resource = "forum-threads", module = "pintopets_forum_threads", icon = "MessagesSquare" },
        { label = "Community replies", resource = "forum-replies", module = "pintopets_forum_replies", icon = "MessageSquareReply" },
        { label = "Community votes", resource = "forum-votes", module = "pintopets_forum_votes", icon = "ThumbsUp" },
        { label = "Community reports", resource = "forum-reports", module = "pintopets_forum_reports", icon = "Flag" },
        { label = "Moderation log", resource = "forum-mod-actions", module = "pintopets_forum_mod_actions", icon = "Gavel" },
        -- opsapi:menu (make:resource adds entries above this line)
    },

    -- Tables whose changes are published as events (<code>.<name>.created /
    -- updated / deleted) that any plugin can subscribe to.
    publishes = {
        pet = "pintopets_pets",
        pet_member = "pintopets_pet_members",
        weight = "pintopets_weights",
        vaccination = "pintopets_vaccinations",
        parasite_treatment = "pintopets_parasite_treatments",
        medication = "pintopets_medications",
        vet_visit = "pintopets_vet_visits",
        condition = "pintopets_conditions",
        allergy = "pintopets_allergies",
        symptom = "pintopets_symptoms",
        horse_care = "pintopets_horse_cares",
        diet_item = "pintopets_diet_items",
        diet_change = "pintopets_diet_changes",
        water_note = "pintopets_water_notes",
        photo = "pintopets_photos",
        -- Secrets never leave the table: kept out of events and the audit trail.
        account_setting = { table = "pintopets_account_settings", hide = "totp_secret_enc,recovery_codes" },
        forum_thread = "pintopets_forum_threads",
        forum_reply = "pintopets_forum_replies",
        forum_report = "pintopets_forum_reports",
        forum_mod_action = "pintopets_forum_mod_actions",
        -- opsapi:publishes (make:resource adds entries above this line)
    },

    -- Settings each workspace fills in under Workspace -> Plugins; read them
    -- with sdk.settings(self), event.settings or job.settings. Rules as in
    -- sdk.validate, plus default, description and secret (stored encrypted).
    settings = {
        -- reminder_days = { type = "integer", label = "Remind after (days)", default = 3, min = 1 },
        -- api_token = { type = "string", label = "API token", secret = true },
    },

    -- default_enabled = false,  -- off in every workspace until it's turned on there
}
