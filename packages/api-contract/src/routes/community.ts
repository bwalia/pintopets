import { z } from "zod";
import { Uuid } from "../common";
import { ApiError } from "../errors";
import { registry } from "../registry";

/**
 * Community forum. Reading is open to everyone; posting, voting and reporting
 * need a signed-in account. Authors are shown by their community name only,
 * never their email.
 */
export const FORUM_CATEGORIES = [
  {
    slug: "health",
    name: "Health and symptoms",
    description: "Illness, symptoms, medicines and recovery. Not for emergencies.",
    health: true,
  },
  {
    slug: "behaviour",
    name: "Behaviour and training",
    description: "Barking, biting, toileting, recall, anxiety and enrichment.",
    health: false,
  },
  {
    slug: "nutrition",
    name: "Food and nutrition",
    description: "Diets, treats, weight and fussy eaters.",
    health: false,
  },
  {
    slug: "new-pets",
    name: "New pet owners",
    description: "Settling in, first vet visits, insurance and kit.",
    health: false,
  },
  {
    slug: "grooming",
    name: "Grooming and care",
    description: "Coats, claws, teeth, hooves, bedding and housing.",
    health: false,
  },
  {
    slug: "adoption",
    name: "Adoption and rescue",
    description: "Rehoming, rescue centres and helping animals in need.",
    health: false,
  },
  {
    slug: "senior-pets",
    name: "Older pets",
    description: "Ageing, mobility, comfort and quality of life.",
    health: true,
  },
  {
    slug: "pet-loss",
    name: "Pet loss and support",
    description: "A kind place to talk about losing a pet.",
    health: false,
  },
  {
    slug: "chat",
    name: "Pet chat",
    description: "Stories, wins, introductions and everything else.",
    health: false,
  },
] as const;

export type ForumCategorySlug = (typeof FORUM_CATEGORIES)[number]["slug"];
export const ForumCategory = z
  .enum(FORUM_CATEGORIES.map((c) => c.slug) as [ForumCategorySlug, ...ForumCategorySlug[]])
  .meta({ id: "ForumCategory" });

export const ForumSort = z.enum(["latest", "top", "unanswered", "new"]).meta({ id: "ForumSort" });
export const ForumTargetType = z.enum(["thread", "reply"]).meta({ id: "ForumTargetType" });
export const ForumReportReason = z
  .enum(["spam", "abuse", "unsafe_advice", "animal_welfare", "off_topic", "other"])
  .meta({ id: "ForumReportReason" });
export const ForumPostStatus = z.enum(["visible", "hidden", "removed"]).meta({
  id: "ForumPostStatus",
  description: "hidden = waiting for a moderator (shown only to its author and moderators).",
});

const slug = z.string().regex(/^[a-z0-9-]{1,60}$/);
const tag = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{0,23}$/, "Tags use letters, numbers and dashes");

export const ThreadInput = z
  .object({
    category: ForumCategory,
    speciesSlug: slug.nullish().transform((v) => v ?? null),
    title: z
      .string()
      .trim()
      .min(8, "Please make the title at least 8 characters")
      .max(150, "Please keep the title under 150 characters"),
    body: z
      .string()
      .trim()
      .min(20, "Please add a little more detail (20 characters or more)")
      .max(10_000),
    tags: z.array(tag).max(5, "Up to 5 tags").default([]),
  })
  .meta({ id: "ForumThreadInput" });
export type ThreadInputParsed = z.output<typeof ThreadInput>;

export const ThreadUpdate = ThreadInput.pick({ title: true, body: true, tags: true })
  .partial()
  .meta({ id: "ForumThreadUpdate" });
export type ThreadUpdateParsed = z.output<typeof ThreadUpdate>;

export const ReplyInput = z
  .object({ body: z.string().trim().min(2, "Please write a reply").max(10_000) })
  .meta({ id: "ForumReplyInput" });

export const VoteInput = z
  .object({ targetType: ForumTargetType, targetId: Uuid, voted: z.boolean() })
  .meta({ id: "ForumVoteInput" });

export const ReportInput = z
  .object({
    targetType: ForumTargetType,
    targetId: Uuid,
    reason: ForumReportReason,
    details: z
      .string()
      .trim()
      .max(1000)
      .nullish()
      .transform((v) => v || null),
  })
  .meta({ id: "ForumReportInput" });

export const CommunityNameInput = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "At least 2 characters")
      .max(40, "Up to 40 characters")
      .regex(
        /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u,
        "Use letters, numbers, spaces, dots, dashes or apostrophes",
      ),
  })
  .meta({ id: "CommunityNameInput" });

export const ThreadListQuery = z.object({
  category: ForumCategory.optional(),
  species: slug.optional(),
  q: z.string().trim().max(200).optional(),
  sort: ForumSort.default("latest"),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

const Author = z.object({ name: z.string(), isYou: z.boolean() }).meta({ id: "ForumAuthor" });

export const ThreadSummary = z
  .object({
    id: Uuid,
    category: ForumCategory,
    speciesSlug: z.string().nullable(),
    title: z.string(),
    excerpt: z.string(),
    tags: z.array(z.string()),
    author: Author,
    score: z.number().int(),
    replyCount: z.number().int(),
    solved: z.boolean(),
    isPinned: z.boolean(),
    isLocked: z.boolean(),
    lastActivityAt: z.iso.datetime(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "ForumThreadSummary" });
export type ThreadSummary = z.infer<typeof ThreadSummary>;

export const Reply = z
  .object({
    id: Uuid,
    threadId: Uuid,
    body: z.string(),
    author: Author,
    status: ForumPostStatus,
    score: z.number().int(),
    viewerVoted: z.boolean(),
    isAccepted: z.boolean(),
    editedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    can: z.object({ edit: z.boolean(), delete: z.boolean(), accept: z.boolean() }),
  })
  .meta({ id: "ForumReply" });
export type Reply = z.infer<typeof Reply>;

export const Thread = ThreadSummary.omit({ excerpt: true })
  .extend({
    body: z.string(),
    status: ForumPostStatus,
    viewerVoted: z.boolean(),
    acceptedReplyId: Uuid.nullable(),
    editedAt: z.iso.datetime().nullable(),
    replies: z.array(Reply),
    can: z.object({
      reply: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
      moderate: z.boolean(),
    }),
  })
  .meta({ id: "ForumThread" });
export type Thread = z.infer<typeof Thread>;

export const ThreadListResponse = z
  .object({
    data: z.array(ThreadSummary),
    meta: z.object({
      page: z.number().int(),
      totalPages: z.number().int(),
      total: z.number().int(),
    }),
  })
  .meta({ id: "ForumThreadListResponse" });
export const ThreadResponse = z.object({ data: Thread }).meta({ id: "ForumThreadResponse" });
export const ReplyResponse = z.object({ data: Reply }).meta({ id: "ForumReplyResponse" });
export const VoteResponse = z
  .object({ data: z.object({ voted: z.boolean(), score: z.number().int() }) })
  .meta({ id: "ForumVoteResponse" });

export const ThreadIdParams = z.object({ threadId: Uuid });

// --- OpenAPI ---------------------------------------------------------------

const json = <T extends z.ZodType>(schema: T) => ({
  content: { "application/json": { schema } },
});
const err = (description: string) => ({ description, ...json(ApiError) });
const tags = ["Community"];

registry.registerPath({
  method: "get",
  path: "/api/v1/community/threads",
  operationId: "listForumThreads",
  tags,
  summary: "Browse, filter and search community threads (no sign-in needed)",
  request: { query: ThreadListQuery },
  responses: { 200: { description: "Threads", ...json(ThreadListResponse) } },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/community/threads",
  operationId: "createForumThread",
  tags,
  summary: "Start a discussion",
  request: { body: json(ThreadInput) },
  responses: {
    201: { description: "Created", ...json(ThreadResponse) },
    401: err("Not signed in"),
    403: err("Suspended from the community"),
    422: err("Invalid, or breaks the community rules"),
    429: err("Posting too quickly"),
  },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/community/threads/{threadId}",
  operationId: "getForumThread",
  tags,
  summary: "A thread with its replies",
  request: { params: ThreadIdParams },
  responses: {
    200: { description: "Thread", ...json(ThreadResponse) },
    404: err("Not found"),
  },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/community/threads/{threadId}/replies",
  operationId: "createForumReply",
  tags,
  summary: "Reply to a thread",
  request: { params: ThreadIdParams, body: json(ReplyInput) },
  responses: {
    201: { description: "Created", ...json(ReplyResponse) },
    401: err("Not signed in"),
    403: err("Thread locked, or suspended"),
    404: err("Not found"),
    422: err("Invalid, or breaks the community rules"),
    429: err("Posting too quickly"),
  },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/community/votes",
  operationId: "voteForumPost",
  tags,
  summary: "Mark a thread or reply as helpful (or undo)",
  request: { body: json(VoteInput) },
  responses: {
    200: { description: "Vote saved", ...json(VoteResponse) },
    401: err("Not signed in"),
    422: err("Invalid"),
    429: err("Too many votes"),
  },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/community/reports",
  operationId: "reportForumPost",
  tags,
  summary: "Report a thread or reply to the moderators",
  request: { body: json(ReportInput) },
  responses: {
    204: { description: "Reported" },
    401: err("Not signed in"),
    404: err("Not found"),
    429: err("Too many reports"),
  },
});
