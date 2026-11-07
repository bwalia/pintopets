-- Community forum: read views and the few writes that must be atomic in SQL.
-- Plain creates/updates use the generated CRUD routes (forum_*.lua). Every
-- query is filtered by namespace_id (PLUGINS.md §5.2). PintoPets' server
-- decides who may see or do what; these routes only shape the data.
--
--   GET  /forum/threads                    visible threads: ?category=&species=&q=&sort=latest|top|unanswered&author_uuid=&page=&per_page=
--   GET  /forum/threads/:uuid              one thread (any status) + author name + ?viewer= vote
--   GET  /forum/threads/:uuid/replies      its replies (any status) + author names + ?viewer= votes
--   POST /forum/threads/:uuid/refresh      recount replies and last activity
--   POST /forum/votes                      { target_type, target_uuid, user_uuid, voted } → { voted, score }
--   GET  /forum/users/:user_uuid/activity  ?minutes= → counts of recent posts, votes and reports (rate limits)
--   GET  /forum/reports/queue              open reports grouped by target, with the content
--   POST /forum/reports/resolve            { target_type, target_uuid, status, resolver_uuid }
local sdk = require("helper.plugin-sdk")
local unpack = table.unpack or unpack

local UUID = "^%x%x%x%x%x%x%x%x%-%x%x%x%x%-%x%x%x%x%-%x%x%x%x%-%x%x%x%x%x%x%x%x%x%x%x%x$"
local SLUG = "^[a-z0-9-]+$"
local TARGETS = { thread = "pintopets_forum_threads", reply = "pintopets_forum_replies" }

local function uuid_or_blank(value)
    if value == nil or value == "" then return "" end
    if type(value) ~= "string" or not value:match(UUID) then return nil end
    return value:lower()
end

local function slug_or_blank(value)
    if value == nil or value == "" then return "" end
    if type(value) ~= "string" or #value > 60 or not value:match(SLUG) then return nil end
    return value
end

local function int_param(value, default, min, max)
    local n = tonumber(value)
    if not n or n % 1 ~= 0 then return default end
    return math.max(min, math.min(max, n))
end

local ORDER = {
    latest = "t.is_pinned DESC, t.last_activity_at DESC",
    top = "t.score DESC, t.reply_count DESC, t.last_activity_at DESC",
    unanswered = "t.created_at DESC",
    new = "t.created_at DESC",
}

return function(app)
    app:get("/forum/threads", sdk.handler({ permission = "pintopets_forum_threads.read" }, function(self)
        local p = self.params
        local category, species = slug_or_blank(p.category), slug_or_blank(p.species)
        local author = uuid_or_blank(p.author_uuid)
        local sort = p.sort or "latest"
        local q = type(p.q) == "string" and p.q:sub(1, 200) or ""
        if not category or not species or not author or not ORDER[sort] then
            return sdk.error(400, "category/species must be slugs, author_uuid a UUID, sort latest|top|unanswered|new")
        end
        local per_page = int_param(p.per_page, 20, 1, 50)
        local page = int_param(p.page, 1, 1, 500)
        local ns = sdk.namespace_id(self)
        local where = [[
            t.namespace_id = ? AND t.status = 'visible'
            AND (? = '' OR t.category = ?)
            AND (? = '' OR t.species = ?)
            AND (? = '' OR t.author_user_uuid = NULLIF(?, '')::uuid)
            AND (? = '' OR to_tsvector('english', t.title || ' ' || t.body || ' ' || coalesce(t.tags, ''))
                           @@ plainto_tsquery('english', ?)
                       OR t.title ILIKE '%' || ? || '%')
        ]] .. (sort == "unanswered" and " AND t.reply_count = 0" or "")
        local like = q:gsub("[%%_\\]", "\\%0")
        local args = { ns, category, category, species, species, author, author, q, q, like }
        local rows = sdk.db.query([[
            SELECT t.uuid, t.author_user_uuid, t.category, t.species, t.title, left(t.body, 280) AS excerpt,
                   t.tags, t.status, t.is_locked, t.is_pinned, t.score, t.reply_count, t.accepted_reply_uuid,
                   t.last_activity_at, t.created_at, t.updated_at, m.display_name AS author_name
              FROM pintopets_forum_threads t
              LEFT JOIN pintopets_forum_members m ON m.namespace_id = t.namespace_id AND m.user_uuid = t.author_user_uuid
             WHERE ]] .. where .. " ORDER BY " .. ORDER[sort] .. " LIMIT " .. per_page .. " OFFSET " .. ((page - 1) * per_page),
            unpack(args))
        local total = sdk.db.query("SELECT COUNT(*)::int AS n FROM pintopets_forum_threads t WHERE " .. where,
            unpack(args))[1].n
        return sdk.ok(sdk.array(rows), {
            total = total, page = page, per_page = per_page,
            total_pages = math.max(1, math.ceil(total / per_page)),
        })
    end))

    app:get("/forum/threads/:uuid", sdk.handler({ permission = "pintopets_forum_threads.read" }, function(self)
        local id, viewer = uuid_or_blank(self.params.uuid), uuid_or_blank(self.params.viewer)
        if not id or id == "" or not viewer then return sdk.error(400, "uuid and viewer must be UUIDs") end
        local ns = sdk.namespace_id(self)
        local row = sdk.db.query([[
            SELECT t.*, m.display_name AS author_name,
                   (v.id IS NOT NULL) AS viewer_voted
              FROM pintopets_forum_threads t
              LEFT JOIN pintopets_forum_members m ON m.namespace_id = t.namespace_id AND m.user_uuid = t.author_user_uuid
              LEFT JOIN pintopets_forum_votes v ON v.namespace_id = t.namespace_id AND v.target_type = 'thread'
                    AND v.target_uuid = t.uuid AND v.user_uuid = NULLIF(?, '')::uuid
             WHERE t.namespace_id = ? AND t.uuid = ?::uuid
        ]], viewer, ns, id)[1]
        if not row then return sdk.not_found("Thread") end
        return sdk.ok(row)
    end))

    app:get("/forum/threads/:uuid/replies", sdk.handler({ permission = "pintopets_forum_replies.read" }, function(self)
        local id, viewer = uuid_or_blank(self.params.uuid), uuid_or_blank(self.params.viewer)
        if not id or id == "" or not viewer then return sdk.error(400, "uuid and viewer must be UUIDs") end
        local ns = sdk.namespace_id(self)
        local rows = sdk.db.query([[
            SELECT r.*, m.display_name AS author_name, (v.id IS NOT NULL) AS viewer_voted
              FROM pintopets_forum_replies r
              LEFT JOIN pintopets_forum_members m ON m.namespace_id = r.namespace_id AND m.user_uuid = r.author_user_uuid
              LEFT JOIN pintopets_forum_votes v ON v.namespace_id = r.namespace_id AND v.target_type = 'reply'
                    AND v.target_uuid = r.uuid AND v.user_uuid = NULLIF(?, '')::uuid
             WHERE r.namespace_id = ? AND r.thread_uuid = ?::uuid
             ORDER BY r.created_at
             LIMIT 1000
        ]], viewer, ns, id)
        return sdk.ok(sdk.array(rows))
    end))

    app:post("/forum/threads/:uuid/refresh", sdk.handler({ permission = "pintopets_forum_threads.update" }, function(self)
        local id = uuid_or_blank(self.params.uuid)
        if not id or id == "" then return sdk.error(400, "uuid must be a UUID") end
        local ns = sdk.namespace_id(self)
        local row = sdk.db.query([[
            UPDATE pintopets_forum_threads t
               SET reply_count = c.n,
                   last_activity_at = GREATEST(t.created_at, COALESCE(c.latest, t.created_at)),
                   updated_at = NOW()
              FROM (SELECT COUNT(*)::int AS n, MAX(created_at) AS latest
                      FROM pintopets_forum_replies
                     WHERE namespace_id = ? AND thread_uuid = ?::uuid AND status = 'visible') c
             WHERE t.namespace_id = ? AND t.uuid = ?::uuid
         RETURNING t.uuid, t.reply_count, t.last_activity_at
        ]], ns, id, ns, id)[1]
        if not row then return sdk.not_found("Thread") end
        return sdk.ok(row)
    end))

    -- Sets (not toggles) a vote, so a retried request can't flip it back.
    app:post("/forum/votes", sdk.handler({ permission = "pintopets_forum_votes.create" }, function(self)
        local body, err = sdk.body(self)
        if not body then return sdk.error(400, err) end
        local tbl = TARGETS[body.target_type]
        local target, user = uuid_or_blank(body.target_uuid), uuid_or_blank(body.user_uuid)
        if not tbl or not target or target == "" or not user or user == "" or type(body.voted) ~= "boolean" then
            return sdk.error(422, "Invalid vote", { target_type = "thread|reply; target_uuid, user_uuid UUIDs; voted boolean" })
        end
        local ns = sdk.namespace_id(self)
        local exists = sdk.db.query("SELECT 1 FROM " .. tbl .. " WHERE namespace_id = ? AND uuid = ?::uuid AND status = 'visible'",
            ns, target)[1]
        if not exists then return sdk.not_found("Post") end
        if body.voted then
            sdk.db.query([[
                INSERT INTO pintopets_forum_votes (namespace_id, target_type, target_uuid, user_uuid)
                VALUES (?, ?, ?::uuid, ?::uuid)
                ON CONFLICT (namespace_id, target_type, target_uuid, user_uuid) DO NOTHING
            ]], ns, body.target_type, target, user)
        else
            sdk.db.query([[
                DELETE FROM pintopets_forum_votes
                 WHERE namespace_id = ? AND target_type = ? AND target_uuid = ?::uuid AND user_uuid = ?::uuid
            ]], ns, body.target_type, target, user)
        end
        local row = sdk.db.query("UPDATE " .. tbl .. [[ SET score = (
                SELECT COUNT(*)::int FROM pintopets_forum_votes
                 WHERE namespace_id = ? AND target_type = ? AND target_uuid = ?::uuid)
             WHERE namespace_id = ? AND uuid = ?::uuid RETURNING score]],
            ns, body.target_type, target, ns, target)[1]
        return sdk.ok({ voted = body.voted, score = row and row.score or 0 })
    end))

    app:get("/forum/users/:user_uuid/activity", sdk.handler({ permission = "pintopets_forum_threads.read" }, function(self)
        local user = uuid_or_blank(self.params.user_uuid)
        if not user or user == "" then return sdk.error(400, "user_uuid must be a UUID") end
        local minutes = int_param(self.params.minutes, 60, 1, 7 * 24 * 60)
        local ns = sdk.namespace_id(self)
        local row = sdk.db.query([[
            SELECT
              (SELECT COUNT(*)::int FROM pintopets_forum_threads WHERE namespace_id = ? AND author_user_uuid = ?::uuid
                 AND created_at > NOW() - make_interval(mins => ?)) AS threads,
              (SELECT COUNT(*)::int FROM pintopets_forum_replies WHERE namespace_id = ? AND author_user_uuid = ?::uuid
                 AND created_at > NOW() - make_interval(mins => ?)) AS replies,
              (SELECT COUNT(*)::int FROM pintopets_forum_votes WHERE namespace_id = ? AND user_uuid = ?::uuid
                 AND created_at > NOW() - make_interval(mins => ?)) AS votes,
              (SELECT COUNT(*)::int FROM pintopets_forum_reports WHERE namespace_id = ? AND reporter_user_uuid = ?::uuid
                 AND created_at > NOW() - make_interval(mins => ?)) AS reports
        ]], ns, user, minutes, ns, user, minutes, ns, user, minutes, ns, user, minutes)[1]
        return sdk.ok(row)
    end))

    app:get("/forum/reports/queue", sdk.handler({ permission = "pintopets_forum_reports.read" }, function(self)
        local ns = sdk.namespace_id(self)
        local rows = sdk.db.query([[
            SELECT r.target_type, r.target_uuid, r.thread_uuid,
                   COUNT(*)::int AS report_count,
                   MIN(r.created_at) AS first_reported_at,
                   array_to_json(array_agg(DISTINCT r.reason)) AS reasons,
                   array_to_json((array_agg(r.details ORDER BY r.created_at) FILTER (WHERE r.details IS NOT NULL))[1:5]) AS details,
                   t.title AS thread_title,
                   COALESCE(rp.body, t.body) AS content,
                   COALESCE(rp.status, t.status) AS content_status,
                   COALESCE(rp.author_user_uuid, t.author_user_uuid) AS author_user_uuid,
                   m.display_name AS author_name, m.suspended_until AS author_suspended_until
              FROM pintopets_forum_reports r
              JOIN pintopets_forum_threads t ON t.namespace_id = r.namespace_id AND t.uuid = r.thread_uuid
              LEFT JOIN pintopets_forum_replies rp ON r.target_type = 'reply'
                    AND rp.namespace_id = r.namespace_id AND rp.uuid = r.target_uuid
              LEFT JOIN pintopets_forum_members m ON m.namespace_id = r.namespace_id
                    AND m.user_uuid = COALESCE(rp.author_user_uuid, t.author_user_uuid)
             WHERE r.namespace_id = ? AND r.status = 'open'
             GROUP BY r.target_type, r.target_uuid, r.thread_uuid, t.title, rp.body, t.body, rp.status, t.status,
                      rp.author_user_uuid, t.author_user_uuid, m.display_name, m.suspended_until
             ORDER BY COUNT(*) DESC, MIN(r.created_at)
             LIMIT 100
        ]], ns)
        return sdk.ok(sdk.array(rows))
    end))

    app:post("/forum/reports/resolve", sdk.handler({ permission = "pintopets_forum_reports.update" }, function(self)
        local body, err = sdk.body(self)
        if not body then return sdk.error(400, err) end
        local target, resolver = uuid_or_blank(body.target_uuid), uuid_or_blank(body.resolver_uuid)
        if not TARGETS[body.target_type] or not target or target == "" or not resolver or resolver == ""
            or (body.status ~= "actioned" and body.status ~= "dismissed") then
            return sdk.error(422, "Invalid resolve", { status = "actioned|dismissed; target and resolver UUIDs" })
        end
        local res = sdk.db.query([[
            UPDATE pintopets_forum_reports
               SET status = ?, resolved_by_user_uuid = ?::uuid, resolved_at = NOW(), updated_at = NOW()
             WHERE namespace_id = ? AND target_type = ? AND target_uuid = ?::uuid AND status = 'open'
        ]], body.status, resolver, sdk.namespace_id(self), body.target_type, target)
        return sdk.ok({ resolved = res.affected_rows or 0 })
    end))

    local any = { type = "object", additionalProperties = true }
    local list = { type = "array", items = any }
    sdk.doc(app, "GET /forum/threads", { summary = "Visible community threads (filter, search, sort)",
        permission = "pintopets_forum_threads.read",
        query = { category = { type = "string" }, species = { type = "string" }, q = { type = "string" },
                  sort = { type = "string", enum = { "latest", "top", "unanswered", "new" } },
                  author_uuid = { type = "string", format = "uuid" },
                  page = { type = "integer" }, per_page = { type = "integer" } },
        response = list })
    sdk.doc(app, "GET /forum/threads/:uuid", { summary = "A thread with author name and the viewer's vote",
        permission = "pintopets_forum_threads.read",
        path = { uuid = { type = "string", format = "uuid" } },
        query = { viewer = { type = "string", format = "uuid" } }, response = any })
    sdk.doc(app, "GET /forum/threads/:uuid/replies", { summary = "A thread's replies with author names and the viewer's votes",
        permission = "pintopets_forum_replies.read",
        path = { uuid = { type = "string", format = "uuid" } },
        query = { viewer = { type = "string", format = "uuid" } }, response = list })
    sdk.doc(app, "POST /forum/threads/:uuid/refresh", { summary = "Recount a thread's replies and last activity",
        permission = "pintopets_forum_threads.update",
        path = { uuid = { type = "string", format = "uuid" } }, response = any })
    sdk.doc(app, "POST /forum/votes", { summary = "Set or clear a helpful vote; returns the new score",
        permission = "pintopets_forum_votes.create", body = any, response = any })
    sdk.doc(app, "GET /forum/users/:user_uuid/activity", { summary = "A user's recent forum activity counts",
        permission = "pintopets_forum_threads.read",
        path = { user_uuid = { type = "string", format = "uuid" } },
        query = { minutes = { type = "integer" } }, response = any })
    sdk.doc(app, "GET /forum/reports/queue", { summary = "Open reports grouped by reported post",
        permission = "pintopets_forum_reports.read", response = list })
    sdk.doc(app, "POST /forum/reports/resolve", { summary = "Close every open report on a post",
        permission = "pintopets_forum_reports.update", body = any, response = any })
end
