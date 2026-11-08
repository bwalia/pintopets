"use server";

import {
  CommunityNameInput,
  ForumTargetType,
  ReplyInput,
  ReportInput,
  ThreadInput,
  ThreadUpdate,
  Uuid,
  VoteInput,
} from "@pintopets/api-contract";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, runAction as run } from "@/server/actions";
import { requireUser } from "@/server/auth";
import {
  acceptAnswer,
  createReply,
  createThread,
  type ModAction,
  moderate,
  removeReply,
  removeThread,
  report,
  setDisplayName,
  suspendMember,
  updateReply,
  updateThread,
  vote,
} from "@/server/community/service";
import { SUSPENSION_DAYS } from "@/server/community/rules";
import { requireStepUp } from "@/server/security/step-up";

const threadPath = (id: string) => `/community/t/${id}`;

export async function createThreadAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const thread = await createThread(await requireUser(), ThreadInput.parse(input));
    revalidatePath("/community");
    return { id: thread.id };
  });
}

export async function updateThreadAction(threadId: unknown, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const id = Uuid.parse(threadId);
    await updateThread(await requireUser(), id, ThreadUpdate.parse(input));
    revalidatePath(threadPath(id));
    return undefined;
  });
}

export async function removeThreadAction(threadId: unknown): Promise<ActionResult> {
  return run(async () => {
    await removeThread(await requireUser(), Uuid.parse(threadId));
    revalidatePath("/community");
    return undefined;
  });
}

export async function createReplyAction(threadId: unknown, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const id = Uuid.parse(threadId);
    await createReply(await requireUser(), id, ReplyInput.parse(input).body);
    revalidatePath(threadPath(id));
    return undefined;
  });
}

export async function updateReplyAction(replyId: unknown, input: unknown): Promise<ActionResult> {
  return run(async () => {
    await updateReply(await requireUser(), Uuid.parse(replyId), ReplyInput.parse(input).body);
    return undefined;
  });
}

export async function removeReplyAction(replyId: unknown): Promise<ActionResult> {
  return run(async () => {
    const threadId = await removeReply(await requireUser(), Uuid.parse(replyId));
    revalidatePath(threadPath(threadId));
    return undefined;
  });
}

export async function acceptAnswerAction(
  threadId: unknown,
  replyId: unknown,
): Promise<ActionResult> {
  return run(async () => {
    const id = Uuid.parse(threadId);
    await acceptAnswer(await requireUser(), id, Uuid.nullable().parse(replyId));
    revalidatePath(threadPath(id));
    return undefined;
  });
}

export async function voteAction(
  input: unknown,
): Promise<ActionResult<{ voted: boolean; score: number }>> {
  return run(async () => vote(await requireUser(), VoteInput.parse(input)));
}

export async function reportAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await report(await requireUser(), ReportInput.parse(input));
    return undefined;
  });
}

export async function setCommunityNameAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const { displayName } = CommunityNameInput.parse(input);
    await setDisplayName(await requireUser(), displayName);
    revalidatePath("/account");
    revalidatePath("/community");
    return undefined;
  });
}

const Moderate = z.object({
  targetType: ForumTargetType,
  targetId: Uuid,
  action: z.enum(["hide", "restore", "remove", "dismiss", "lock", "unlock", "pin", "unpin"]),
  reason: z.string().trim().max(500).nullish(),
});

export async function moderateAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const parsed = Moderate.parse(input);
    await moderate(await requireUser(), { ...parsed, action: parsed.action as ModAction });
    revalidatePath("/moderation");
    revalidatePath("/community");
    return undefined;
  });
}

const Suspend = z.object({
  userId: Uuid,
  days: z.union([z.literal(0), ...SUSPENSION_DAYS.map((d) => z.literal(d))]),
  reason: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null),
});

/** Pausing someone is serious: it needs a fresh authenticator code (step-up). */
export async function suspendMemberAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const actor = await requireUser();
    await requireStepUp(actor);
    await suspendMember(actor, Suspend.parse(input));
    revalidatePath("/moderation");
    return undefined;
  });
}
