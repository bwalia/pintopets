-- Local development and CI only: run by docker-compose.opsapi.yml's `bootstrap`
-- service against its throwaway database. Never copied into an image and never
-- run against a shared OpsAPI.
--
-- Creates the `pintopets` workspace and prints an opsk_ API key scoped to every
-- PintoPets module, which is what PintoPets' server (the BFF) uses.
local cjson = require("cjson")
local db = require("lapis.db")

require("scripts.setup-namespace").run({
    project_code = "all",
    namespace_name = "PintoPets",
    namespace_slug = "pintopets",
    admin_email = "admin@pintopets.local",
    admin_password = "local-only-not-a-secret",
})

local ns = db.select("id FROM namespaces WHERE slug = ?", "pintopets")[1]
assert(ns, "the pintopets namespace wasn't created")

local manifest = dofile("/app/projects/pintopets/project.lua")
local scopes = {}
for _, m in ipairs(manifest.modules) do
    scopes[m.machine_name] = { "read", "create", "update", "delete" }
end

local ApiKey = require("helper.api-key")
local raw, prefix, hash = ApiKey.generate()
require("queries.ApiKeyQueries").create({
    namespace_id = ns.id,
    name = "pintopets-local",
    key_prefix = prefix,
    key_hash = hash,
    scopes = cjson.encode(scopes),
})

print("")
print("OPSAPI_URL=http://localhost:4042")
print("OPSAPI_NAMESPACE=pintopets")
print("OPSAPI_API_KEY=" .. raw)
