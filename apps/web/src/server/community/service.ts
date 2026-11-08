import "server-only";
import {
  type ForumCategorySlug,
  type Reply,
  type Thread,
  type ThreadInputParsed,
  type ThreadSummary,
  type ThreadUpdateParsed,
  type ReportInput,
  type VoteInput,
} from "@pintopets/api-contract";
import type { z } from "zod";
import { type Actor, isModerator } from "../auth";
import { HttpError } from "../http";
import {
  createRow,
  getRow,
  listAll,
  listPage,
  pluginGet,
  pluginPost,
  type Resource,
  updateRow,
} from "../opsapi/client";
import { type OpsRow, pgTimestampToIso } from "../opsapi/mapping";
import { speciesBySlug } from "../reference-data";
import {
  type Activity,
  AUTO_HIDE_REPORTS,
  checkContent,
  checkDisplayName,
  cleanText,
  isDuplicate,
  isSuspended,
  type LimitKind,
  overLimit,
  type RuleViolation,
  suggestDisplayName,
} from "./rules";

/**
 * Community forum. OpsAPI stores everything (opsapi/pintopets/api/forum*.lua);
 * every permission decision is made here, before any write:
 *  - reading is public; hidden posts are seen only by their author and moderators;
 *  - posting, voting and reporting need an account that isn't suspended, and are
 *    rate limited per person;
 *  - only authors edit their posts; authors and moderators remove them;
 *  - enough reports hide a post until a moderator reviews it;
 *  - moderators' actions are written to an audit log.
 */
type Viewer = Pick<Actor, "id" | "role"> | null;
type Who = Pick<Actor, "id" | "role" | "displayName">;

const iso = (v: unknown) => (typeof v === "string" && v ? pgTimestampToIso(v) : null);
const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
const tagList = (v: unknown) => (str(v) ?? "").split(",").filter(Boolean);

// --- members ----------------------------------------------------------------

async function memberRow(userId: string): Promise<OpsRow | null> {
  const [row] = await listPage("forum-members", { user_uuid: userId, per_page: 1 });
  return row ?? null;
}

export interface CommunityProfile {
  displayName: string;
  suspendedUntil: string | null;
  suspensionReason: string | null;
  /** True until they have used the community (name not saved yet). */
  isNew: boolean;
}

export async function communityProfile(actor: Who): Promise<CommunityProfile> {
  const row = await memberRow(actor.id);
  if (!row) {
    return {
      displayName: suggestDisplayName(actor.displayName, actor.id),
      suspendedUntil: null,
      suspensionReason: null,
      isNew: true,
    };
  }
  return {
    displayName: String(row.display_name),
    suspendedUntil: iso(row.suspended_until),
    suspensionReason: str(row.suspension_reason),
    isNew: false,
  };
}

async function ensureMember(actor: Who): Promise<OpsRow> {
  const existing = await memberRow(actor.id);
  if (existing) return existing;
  const base = suggestDisplayName(actor.displayName, actor.id);
  for (let attempt = 0; attempt < 5; attempt++) {
    const name =
      attempt === 0
        ? base
        : `${base.replace(/ \d{4}$/, "")} ${1000 + Math.floor(Math.random() * 9000)}`;
    try {
      return await createRow("forum-members", { userUuid: actor.id, displayName: name });
    } catch (error) {
      if (!(error instanceof HttpError && error.code === "conflict")) throw error;
      const raced = await memberRow(actor.id);
      if (raced) return raced;
    }
  }
  throw new HttpError("conflict", "We couldn't set up your community name. Please try again.");
}

export async function setDisplayName(actor: Who, displayName: string): Promise<CommunityProfile> {
  const name = cleanText(displayName);
  const problem = checkDisplayName(name);
  if (problem)
    throw new HttpError("validation_failed", problem, [
      { path: ["displayName"], message: problem },
    ]);
  const member = await ensureMember(actor);
  try {
    await updateRow("forum-members", member.uuid, { displayName: name });
  } catch (error) {
    if (error instanceof HttpError && error.code === "conflict") {
      const msg = "Someone already uses that name. Please choose another.";
      throw new HttpError("validation_failed", msg, [{ path: ["displayName"], message: msg }]);
    }
    throw error;
  }
  return communityProfile(actor);
}

/** The member row, or a 403 when suspended. */
async function assertCanParticipate(actor: Who): Promise<OpsRow> {
  const member = await ensureMember(actor);
  if (isSuspended(str(member.suspended_until))) {
    const until = new Date(String(iso(member.suspended_until))).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    throw new HttpError(
      "forbidden",
      `Your community account is paused until ${until}. You can still read the community.`,
    );
  }
  return member;
}

async function assertRate(actor: Pick<Actor, "id">, kind: LimitKind): Promise<void> {
  const window = kind === "report" ? 24 * 60 : 60;
  const { data } = await pluginGet<Activity>(`/forum/users/${actor.id}/activity`, {
    minutes: window,
  });
  const message = overLimit(kind, data, data);
  if (message) throw new HttpError("rate_limited", message);
}

function assertRules(violations: RuleViolation[]): void {
  if (!violations.length) return;
  throw new HttpError(
    "validation_failed",
    violations[0]?.message ?? "Please check your post.",
    violations.map((v) => ({ path: [v.field], message: v.message })),
  );
}

function assertModerator(actor: Viewer): asserts actor is NonNullable<Viewer> {
  if (!actor || !isModerator(actor)) {
    throw new HttpError("forbidden", "Only community moderators can do that.");
  }
}

// --- mapping ----------------------------------------------------------------

function author(row: OpsRow, field: string, viewer: Viewer) {
  return {
    name: str(row.author_name) ?? "Former member",
    isYou: Boolean(viewer && row[field] === viewer.id),
  };
}

function toSummary(row: OpsRow, viewer: Viewer): ThreadSummary {
  return {
    id: row.uuid,
    category: row.category as ForumCategorySlug,
    speciesSlug: str(row.species),
    title: String(row.title),
    excerpt: String(row.excerpt ?? ""),
    tags: tagList(row.tags),
    author: author(row, "author_user_uuid", viewer),
    score: Number(row.score ?? 0),
    replyCount: Number(row.reply_count ?? 0),
    solved: Boolean(str(row.accepted_reply_uuid)),
    isPinned: row.is_pinned === true,
    isLocked: row.is_locked === true,
    lastActivityAt: String(iso(row.last_activity_at)),
    createdAt: String(iso(row.created_at)),
  };
}

/** Removed posts are never shown; hidden ones only to their author and moderators. */
function canSee(status: unknown, authorId: unknown, viewer: Viewer): boolean {
  if (status === "visible") return true;
  if (status === "hidden")
    return Boolean(viewer && (isModerator(viewer) || authorId === viewer.id));
  return false;
}

// --- reading ----------------------------------------------------------------

export interface ThreadQuery {
  category?: ForumCategorySlug;
  species?: string;
  q?: string;
  sort: "latest" | "top" | "unanswered" | "new";
  page: number;
  authorId?: string;
}

export async function listThreads(viewer: Viewer, query: ThreadQuery) {
  const { data, meta } = await pluginGet<OpsRow[]>("/forum/threads", {
    category: query.category ?? "",
    species: query.species ?? "",
    q: query.q ?? "",
    sort: query.sort,
    page: query.page,
    per_page: 20,
    author_uuid: query.authorId ?? "",
  });
  return {
    data: (data ?? []).map((r) => toSummary(r, viewer)),
    meta: {
      page: Number(meta?.page ?? query.page),
      totalPages: Number(meta?.total_pages ?? 1),
      total: Number(meta?.total ?? 0),
    },
  };
}

async function threadRow(threadId: string, viewer: Viewer): Promise<OpsRow> {
  try {
    const { data } = await pluginGet<OpsRow>(`/forum/threads/${threadId}`, {
      viewer: viewer?.id ?? "",
    });
    return data;
  } catch (error) {
    if (error instanceof HttpError && error.code === "not_found") {
      throw new HttpError("not_found", "We couldn't find that discussion.");
    }
    throw error;
  }
}

export async function getThread(viewer: Viewer, threadId: string): Promise<Thread> {
  const row = await threadRow(threadId, viewer);
  if (!canSee(row.status, row.author_user_uuid, viewer)) {
    throw new HttpError("not_found", "We couldn't find that discussion.");
  }
  const { data: replyRows } = await pluginGet<OpsRow[]>(`/forum/threads/${threadId}/replies`, {
    viewer: viewer?.id ?? "",
  });
  const mod = Boolean(viewer && isModerator(viewer));
  const isAuthor = Boolean(viewer && row.author_user_uuid === viewer.id);
  const locked = row.is_locked === true;
  const accepted = str(row.accepted_reply_uuid);

  const replies: Reply[] = (replyRows ?? [])
    .filter((r) => canSee(r.status, r.author_user_uuid, viewer))
    .map((r) => {
      const mine = Boolean(viewer && r.author_user_uuid === viewer.id);
      return {
        id: r.uuid,
        threadId,
        body: String(r.body),
        author: author(r, "author_user_uuid", viewer),
        status: r.status as Reply["status"],
        score: Number(r.score ?? 0),
        viewerVoted: r.viewer_voted === true,
        isAccepted: accepted === r.uuid,
        editedAt: iso(r.edited_at),
        createdAt: String(iso(r.created_at)),
        can: {
          edit: mine && !locked && r.status !== "removed",
          delete: mine || mod,
          accept: isAuthor && r.status === "visible" && !locked,
        },
      };
    });
  // The accepted answer goes first, then the conversation in order.
  replies.sort((a, b) => Number(b.isAccepted) - Number(a.isAccepted));

  return {
    ...toSummary({ ...row, excerpt: "" }, viewer),
    body: String(row.body),
    status: row.status as Thread["status"],
    viewerVoted: row.viewer_voted === true,
    acceptedReplyId: accepted,
    editedAt: iso(row.edited_at),
    replies,
    can: {
      reply: Boolean(viewer) && row.status === "visible" && !locked,
      edit: isAuthor && !locked,
      delete: isAuthor || mod,
      moderate: mod,
    },
  };
}

// --- writing ----------------------------------------------------------------

function speciesOrNull(slug: string | null): string | null {
  if (!slug) return null;
  if (!speciesBySlug(slug)) {
    throw new HttpError("validation_failed", "Please choose a kind of animal from the list.", [
      { path: ["speciesSlug"], message: "Unknown species" },
    ]);
  }
  return slug;
}

async function recentBodies(resource: Resource, authorId: string): Promise<string[]> {
  const rows = await listPage(resource, {
    author_user_uuid: authorId,
    sort: "created_at",
    order: "desc",
    per_page: 10,
  });
  const hourAgo = Date.now() - 60 * 60 * 1000;
  return rows
    .filter((r) => new Date(String(iso(r.created_at))).getTime() > hourAgo)
    .map((r) => String(r.body));
}

export async function createThread(actor: Who, input: ThreadInputParsed): Promise<Thread> {
  await assertCanParticipate(actor);
  await assertRate(actor, "thread");
  const title = cleanText(input.title);
  const body = cleanText(input.body);
  assertRules(checkContent({ title, body }));
  if (isDuplicate(body, await recentBodies("forum-threads", actor.id))) {
    throw new HttpError(
      "conflict",
      "You've just posted this. Please check your existing discussion.",
    );
  }
  const row = await createRow("forum-threads", {
    authorUserUuid: actor.id,
    category: input.category,
    species: speciesOrNull(input.speciesSlug),
    title,
    body,
    tags: [...new Set(input.tags)].join(",") || null,
  });
  return getThread(actor, row.uuid);
}

async function ownThread(actor: Who, threadId: string): Promise<OpsRow> {
  const row = await getRow("forum-threads", threadId);
  if (!row || row.status === "removed")
    throw new HttpError("not_found", "We couldn't find that discussion.");
  return row;
}

export async function updateThread(
  actor: Who,
  threadId: string,
  patch: ThreadUpdateParsed,
): Promise<Thread> {
  const row = await ownThread(actor, threadId);
  if (row.author_user_uuid !== actor.id)
    throw new HttpError("forbidden", "You can only edit your own posts.");
  if (row.is_locked === true) throw new HttpError("forbidden", "This discussion is locked.");
  await assertCanParticipate(actor);
  const title = patch.title !== undefined ? cleanText(patch.title) : undefined;
  const body = patch.body !== undefined ? cleanText(patch.body) : undefined;
  assertRules(checkContent({ title, body: body ?? "" }));
  await updateRow("forum-threads", threadId, {
    title,
    body,
    tags: patch.tags ? [...new Set(patch.tags)].join(",") || null : undefined,
    editedAt: new Date().toISOString(),
  });
  return getThread(actor, threadId);
}

export async function removeThread(actor: Who, threadId: string, reason?: string): Promise<void> {
  const row = await ownThread(actor, threadId);
  const mine = row.author_user_uuid === actor.id;
  if (!mine && !isModerator(actor))
    throw new HttpError("forbidden", "You can only remove your own posts.");
  await updateRow("forum-threads", threadId, { status: "removed" });
  if (!mine) await logAction(actor, "remove", "thread", threadId, reason);
  await resolveReports(actor, "thread", threadId, "actioned");
}

async function openThread(threadId: string): Promise<OpsRow> {
  const row = await getRow("forum-threads", threadId);
  if (!row || row.status !== "visible")
    throw new HttpError("not_found", "We couldn't find that discussion.");
  if (row.is_locked === true) {
    throw new HttpError("forbidden", "This discussion is locked, so it can't take new replies.");
  }
  return row;
}

export async function createReply(actor: Who, threadId: string, rawBody: string): Promise<Reply> {
  await openThread(threadId);
  await assertCanParticipate(actor);
  await assertRate(actor, "reply");
  const body = cleanText(rawBody);
  assertRules(checkContent({ body }));
  if (isDuplicate(body, await recentBodies("forum-replies", actor.id))) {
    throw new HttpError("conflict", "You've just posted this reply.");
  }
  const row = await createRow("forum-replies", {
    threadUuid: threadId,
    authorUserUuid: actor.id,
    body,
  });
  await pluginPost(`/forum/threads/${threadId}/refresh`);
  const thread = await getThread(actor, threadId);
  const reply = thread.replies.find((r) => r.id === row.uuid);
  if (!reply) throw new Error(`Reply ${row.uuid} missing after create`);
  return reply;
}

async function replyRow(replyId: string): Promise<OpsRow> {
  const row = await getRow("forum-replies", replyId);
  if (!row || row.status === "removed")
    throw new HttpError("not_found", "We couldn't find that reply.");
  return row;
}

export async function updateReply(actor: Who, replyId: string, rawBody: string): Promise<void> {
  const row = await replyRow(replyId);
  if (row.author_user_uuid !== actor.id)
    throw new HttpError("forbidden", "You can only edit your own posts.");
  await openThread(String(row.thread_uuid));
  await assertCanParticipate(actor);
  const body = cleanText(rawBody);
  assertRules(checkContent({ body }));
  await updateRow("forum-replies", replyId, { body, editedAt: new Date().toISOString() });
}

export async function removeReply(actor: Who, replyId: string, reason?: string): Promise<string> {
  const row = await replyRow(replyId);
  const threadId = String(row.thread_uuid);
  const mine = row.author_user_uuid === actor.id;
  if (!mine && !isModerator(actor))
    throw new HttpError("forbidden", "You can only remove your own posts.");
  await updateRow("forum-replies", replyId, { status: "removed" });
  const thread = await getRow("forum-threads", threadId);
  if (thread?.accepted_reply_uuid === replyId) {
    await updateRow("forum-threads", threadId, { acceptedReplyUuid: null });
  }
  await pluginPost(`/forum/threads/${threadId}/refresh`);
  if (!mine) await logAction(actor, "remove", "reply", replyId, reason);
  await resolveReports(actor, "reply", replyId, "actioned");
  return threadId;
}

/** The thread's author marks the reply that answered their question (or clears it). */
export async function acceptAnswer(
  actor: Who,
  threadId: string,
  replyId: string | null,
): Promise<void> {
  const thread = await openThread(threadId);
  if (thread.author_user_uuid !== actor.id) {
    throw new HttpError("forbidden", "Only the person who asked can choose the answer.");
  }
  if (replyId) {
    const reply = await replyRow(replyId);
    if (reply.thread_uuid !== threadId || reply.status !== "visible") {
      throw new HttpError("not_found", "We couldn't find that reply.");
    }
  }
  await updateRow("forum-threads", threadId, { acceptedReplyUuid: replyId });
}

const TARGET: Record<"thread" | "reply", Resource> = {
  thread: "forum-threads",
  reply: "forum-replies",
};

export async function vote(
  actor: Who,
  input: z.output<typeof VoteInput>,
): Promise<{ voted: boolean; score: number }> {
  const row = await getRow(TARGET[input.targetType], input.targetId);
  if (!row || row.status !== "visible")
    throw new HttpError("not_found", "We couldn't find that post.");
  if (row.author_user_uuid === actor.id) {
    throw new HttpError("forbidden", "You can't vote for your own post.");
  }
  await assertCanParticipate(actor);
  if (input.voted) await assertRate(actor, "vote");
  return pluginPost("/forum/votes", {
    target_type: input.targetType,
    target_uuid: input.targetId,
    user_uuid: actor.id,
    voted: input.voted,
  });
}

/**
 * Reports a post. Reporting twice is harmless. Once AUTO_HIDE_REPORTS different
 * people have reported it, it is hidden until a moderator reviews it.
 */
export async function report(actor: Who, input: z.output<typeof ReportInput>): Promise<void> {
  const row = await getRow(TARGET[input.targetType], input.targetId);
  if (!row || row.status === "removed")
    throw new HttpError("not_found", "We couldn't find that post.");
  if (row.author_user_uuid === actor.id) {
    throw new HttpError("bad_request", "You can remove your own post instead of reporting it.");
  }
  await assertRate(actor, "report");
  const threadId = input.targetType === "thread" ? row.uuid : String(row.thread_uuid);
  try {
    await createRow("forum-reports", {
      targetType: input.targetType,
      targetUuid: input.targetId,
      threadUuid: threadId,
      reporterUserUuid: actor.id,
      reason: input.reason,
      details: input.details ? cleanText(input.details) : null,
    });
  } catch (error) {
    if (error instanceof HttpError && error.code === "conflict") return;
    throw error;
  }
  if (row.status !== "visible") return;
  const open = await listAll(
    "forum-reports",
    { target_type: input.targetType, target_uuid: input.targetId, status: "open" },
    2,
  );
  if (new Set(open.map((r) => r.reporter_user_uuid)).size >= AUTO_HIDE_REPORTS) {
    await updateRow(TARGET[input.targetType], input.targetId, { status: "hidden" });
    if (input.targetType === "reply") await pluginPost(`/forum/threads/${threadId}/refresh`);
  }
}

// --- moderation -------------------------------------------------------------

async function logAction(
  actor: Pick<Actor, "id">,
  action: string,
  targetType: "thread" | "reply" | "member",
  targetId: string,
  reason?: string | null,
): Promise<void> {
  await createRow("forum-mod-actions", {
    moderatorUserUuid: actor.id,
    action,
    targetType,
    targetUuid: targetId,
    reason: reason ? cleanText(reason).slice(0, 500) : null,
  });
}

async function resolveReports(
  actor: Pick<Actor, "id">,
  targetType: "thread" | "reply",
  targetId: string,
  status: "actioned" | "dismissed",
): Promise<void> {
  await pluginPost("/forum/reports/resolve", {
    target_type: targetType,
    target_uuid: targetId,
    status,
    resolver_uuid: actor.id,
  });
}

export interface QueueItem {
  targetType: "thread" | "reply";
  targetId: string;
  threadId: string;
  threadTitle: string;
  content: string;
  contentStatus: "visible" | "hidden" | "removed";
  reportCount: number;
  reasons: string[];
  details: string[];
  firstReportedAt: string;
  authorId: string;
  authorName: string;
  authorSuspendedUntil: string | null;
}

export async function moderationQueue(actor: Viewer): Promise<QueueItem[]> {
  assertModerator(actor);
  const { data } = await pluginGet<OpsRow[]>("/forum/reports/queue");
  return (data ?? []).map((r) => ({
    targetType: r.target_type as "thread" | "reply",
    targetId: String(r.target_uuid),
    threadId: String(r.thread_uuid),
    threadTitle: String(r.thread_title),
    content: String(r.content ?? ""),
    contentStatus: r.content_status as QueueItem["contentStatus"],
    reportCount: Number(r.report_count),
    reasons: Array.isArray(r.reasons) ? r.reasons.map(String) : [],
    details: Array.isArray(r.details) ? r.details.map(String) : [],
    firstReportedAt: String(iso(r.first_reported_at)),
    authorId: String(r.author_user_uuid),
    authorName: str(r.author_name) ?? "Former member",
    authorSuspendedUntil: iso(r.author_suspended_until),
  }));
}

export type ModAction =
  "hide" | "restore" | "remove" | "dismiss" | "lock" | "unlock" | "pin" | "unpin";

export async function moderate(
  actor: Viewer,
  input: {
    targetType: "thread" | "reply";
    targetId: string;
    action: ModAction;
    reason?: string | null;
  },
): Promise<void> {
  assertModerator(actor);
  const resource = TARGET[input.targetType];
  const row = await getRow(resource, input.targetId);
  if (!row) throw new HttpError("not_found", "We couldn't find that post.");
  const threadId = input.targetType === "thread" ? row.uuid : String(row.thread_uuid);
  if (["lock", "unlock", "pin", "unpin"].includes(input.action) && input.targetType !== "thread") {
    throw new HttpError("bad_request", "Only discussions can be locked or pinned.");
  }
  switch (input.action) {
    case "hide":
      await updateRow(resource, input.targetId, { status: "hidden" });
      await resolveReports(actor, input.targetType, input.targetId, "actioned");
      break;
    case "remove":
      await updateRow(resource, input.targetId, { status: "removed" });
      await resolveReports(actor, input.targetType, input.targetId, "actioned");
      break;
    case "restore":
      await updateRow(resource, input.targetId, { status: "visible" });
      await resolveReports(actor, input.targetType, input.targetId, "dismissed");
      break;
    case "dismiss":
      await resolveReports(actor, input.targetType, input.targetId, "dismissed");
      break;
    case "lock":
    case "unlock":
      await updateRow("forum-threads", threadId, { isLocked: input.action === "lock" });
      break;
    case "pin":
    case "unpin":
      await updateRow("forum-threads", threadId, { isPinned: input.action === "pin" });
      break;
  }
  if (input.targetType === "reply") await pluginPost(`/forum/threads/${threadId}/refresh`);
  await logAction(actor, input.action, input.targetType, input.targetId, input.reason);
}

/** Pauses (days > 0) or restores (days = 0) someone's posting. Callers require a step-up. */
export async function suspendMember(
  actor: Viewer,
  input: { userId: string; days: number; reason: string | null },
): Promise<void> {
  assertModerator(actor);
  if (input.userId === actor.id) throw new HttpError("bad_request", "You can't suspend yourself.");
  const member = await memberRow(input.userId);
  if (!member) throw new HttpError("not_found", "We couldn't find that member.");
  const until =
    input.days > 0 ? new Date(Date.now() + input.days * 86_400_000).toISOString() : null;
  await updateRow("forum-members", member.uuid, {
    suspendedUntil: until,
    suspensionReason: input.days > 0 ? input.reason : null,
  });
  await logAction(
    actor,
    input.days > 0 ? `suspend_${input.days}d` : "unsuspend",
    "member",
    input.userId,
    input.reason,
  );
}

export interface LogEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  moderatorName: string;
  createdAt: string;
}

export async function moderationLog(actor: Viewer): Promise<LogEntry[]> {
  assertModerator(actor);
  const rows = await listPage("forum-mod-actions", {
    sort: "created_at",
    order: "desc",
    per_page: 50,
  });
  const ids = [...new Set(rows.map((r) => String(r.moderator_user_uuid)))];
  const names = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => {
      const m = await memberRow(id);
      names.set(id, m ? String(m.display_name) : "Moderator");
    }),
  );
  return rows.map((r) => ({
    id: r.uuid,
    action: String(r.action),
    targetType: String(r.target_type),
    targetId: String(r.target_uuid),
    reason: str(r.reason),
    moderatorName: names.get(String(r.moderator_user_uuid)) ?? "Moderator",
    createdAt: String(iso(r.created_at)),
  }));
}

/** Everything someone has written in the community (for their data export). */
export async function communityPosts(actor: Who) {
  const [profile, threads, replies] = await Promise.all([
    communityProfile(actor),
    listAll("forum-threads", { author_user_uuid: actor.id }),
    listAll("forum-replies", { author_user_uuid: actor.id }),
  ]);
  return {
    displayName: profile.isNew ? null : profile.displayName,
    threads: threads.map((t) => ({
      id: t.uuid,
      category: t.category,
      title: t.title,
      body: t.body,
      tags: tagList(t.tags),
      status: t.status,
      createdAt: iso(t.created_at),
      editedAt: iso(t.edited_at),
    })),
    replies: replies.map((r) => ({
      id: r.uuid,
      threadId: r.thread_uuid,
      body: r.body,
      status: r.status,
      createdAt: iso(r.created_at),
      editedAt: iso(r.edited_at),
    })),
  };
}
