import { describe, expect, it } from "vitest";
import type { UserRole } from "../auth";
import { HttpError } from "../http";
import { getRow } from "../opsapi/client";
import {
  acceptAnswer,
  communityPosts,
  communityProfile,
  createReply,
  createThread,
  getThread,
  listThreads,
  moderate,
  moderationLog,
  moderationQueue,
  removeReply,
  report,
  setDisplayName,
  suspendMember,
  updateThread,
  vote,
} from "./service";

const hasOpsApi = Boolean(process.env.OPSAPI_API_KEY && process.env.OPSAPI_URL);
const person = (role: UserRole = "owner", displayName = "Alex Rivers") => ({
  id: crypto.randomUUID(),
  role,
  displayName,
});
const unique = () => crypto.randomUUID().slice(0, 8);

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy(
    (e: unknown) => e instanceof HttpError && e.code === code,
  );
}

async function newThread(author = person()) {
  const thread = await createThread(author, {
    category: "health",
    speciesSlug: "dog",
    title: `Why is my puppy sick after eating ${unique()}?`,
    body: `She is eight months old and it happens straight after breakfast. ${unique()}`,
    tags: ["puppy", "vomiting"],
  });
  return { author, thread };
}

describe.skipIf(!hasOpsApi)("community forum on OpsAPI (integration)", () => {
  it("creates a thread with a safe community name and finds it by search", async () => {
    const { author, thread } = await newThread(person("owner", "sam@example.com"));
    expect(thread.author.name).toMatch(/^Pet lover \d{4}$/);
    expect(thread.author.isYou).toBe(true);
    expect(thread.tags).toEqual(["puppy", "vomiting"]);

    const found = await listThreads(null, {
      q: thread.title.split(" ").at(-1)?.replace("?", ""),
      sort: "latest",
      page: 1,
    });
    expect(found.data.map((t) => t.id)).toContain(thread.id);
    expect(found.data.find((t) => t.id === thread.id)?.author.isYou).toBe(false);

    const renamed = await setDisplayName(author, `Sam ${unique()}`);
    expect(renamed.isNew).toBe(false);
    await expectCode(setDisplayName(author, "PintoPets Support"), "validation_failed");

    // Their data export includes what they wrote.
    const mine = await communityPosts(author);
    expect(mine.displayName).toBe(renamed.displayName);
    expect(mine.threads.map((t) => t.id)).toEqual([thread.id]);
  });

  it("refuses contact details, duplicates and edits by others", async () => {
    const { author, thread } = await newThread();
    await expectCode(
      createThread(author, {
        category: "chat",
        speciesSlug: null,
        title: "Puppies looking for homes",
        body: "Message me on 07700 900123 for details please",
        tags: [],
      }),
      "validation_failed",
    );
    await expectCode(
      createThread(author, {
        category: "health",
        speciesSlug: "dog",
        title: thread.title,
        body: thread.body,
        tags: [],
      }),
      "conflict",
    );
    await expectCode(
      updateThread(person(), thread.id, { title: "Hijacked title here" }),
      "forbidden",
    );
    const edited = await updateThread(author, thread.id, {
      body: `${thread.body} Update: she is fine now.`,
    });
    expect(edited.editedAt).not.toBeNull();
  });

  it("replies, votes (not on your own post) and accepts an answer", async () => {
    const { author, thread } = await newThread();
    const helper = person("owner", "Jo Helper");
    const reply = await createReply(helper, thread.id, "Try smaller meals and a slow feeder bowl.");
    expect(reply.author.isYou).toBe(true);

    await expectCode(
      vote(helper, { targetType: "reply", targetId: reply.id, voted: true }),
      "forbidden",
    );
    expect(await vote(author, { targetType: "reply", targetId: reply.id, voted: true })).toEqual({
      voted: true,
      score: 1,
    });
    // Setting the same vote twice doesn't count twice.
    expect(
      (await vote(author, { targetType: "reply", targetId: reply.id, voted: true })).score,
    ).toBe(1);

    await expectCode(acceptAnswer(helper, thread.id, reply.id), "forbidden");
    await acceptAnswer(author, thread.id, reply.id);
    const solved = await getThread(author, thread.id);
    expect(solved.solved).toBe(true);
    expect(solved.replyCount).toBe(1);
    expect(solved.replies[0]).toMatchObject({
      id: reply.id,
      isAccepted: true,
      viewerVoted: true,
      score: 1,
    });

    await removeReply(helper, reply.id);
    const after = await getThread(author, thread.id);
    expect(after.replies).toHaveLength(0);
    expect(after.acceptedReplyId).toBeNull();
    expect(after.replyCount).toBe(0);
  });

  it("hides a post after three reports and lets a moderator review it", async () => {
    const { author, thread } = await newThread();
    const mod = person("moderator", "Morgan Mod");
    await report(person(), {
      targetType: "thread",
      targetId: thread.id,
      reason: "spam",
      details: null,
    });
    const second = person();
    await report(second, {
      targetType: "thread",
      targetId: thread.id,
      reason: "spam",
      details: "selling",
    });
    await report(second, {
      targetType: "thread",
      targetId: thread.id,
      reason: "spam",
      details: null,
    }); // repeat: ignored
    expect((await getRow("forum-threads", thread.id))?.status).toBe("visible");
    await report(person(), {
      targetType: "thread",
      targetId: thread.id,
      reason: "abuse",
      details: null,
    });
    expect((await getRow("forum-threads", thread.id))?.status).toBe("hidden");

    // Hidden: gone for the public, still visible to its author and moderators.
    await expectCode(getThread(null, thread.id), "not_found");
    expect((await getThread(author, thread.id)).status).toBe("hidden");

    await expectCode(moderationQueue(person()), "forbidden");
    const item = (await moderationQueue(mod)).find((q) => q.targetId === thread.id);
    expect(item).toMatchObject({ reportCount: 3, contentStatus: "hidden" });
    expect(item?.reasons.sort()).toEqual(["abuse", "spam"]);

    await moderate(mod, {
      targetType: "thread",
      targetId: thread.id,
      action: "restore",
      reason: "Fine",
    });
    expect((await getThread(null, thread.id)).status).toBe("visible");
    expect((await moderationQueue(mod)).some((q) => q.targetId === thread.id)).toBe(false);

    await moderate(mod, { targetType: "thread", targetId: thread.id, action: "lock" });
    await expectCode(createReply(person(), thread.id, "Late reply"), "forbidden");
    expect((await moderationLog(mod)).slice(0, 2).map((l) => l.action)).toEqual([
      "lock",
      "restore",
    ]);
  });

  it("a suspended member can read but not post, vote or report", async () => {
    const { author, thread } = await newThread();
    const mod = person("moderator", "Morgan Mod");
    await expectCode(suspendMember(mod, { userId: mod.id, days: 1, reason: null }), "bad_request");
    await suspendMember(mod, { userId: author.id, days: 7, reason: "Spam" });
    expect((await communityProfile(author)).suspendedUntil).not.toBeNull();
    await expectCode(createReply(author, thread.id, "Still here"), "forbidden");
    expect((await getThread(author, thread.id)).id).toBe(thread.id);
    await suspendMember(mod, { userId: author.id, days: 0, reason: "Appeal accepted" });
    expect((await createReply(author, thread.id, "Thanks, back again")).body).toBe(
      "Thanks, back again",
    );
  });
});
