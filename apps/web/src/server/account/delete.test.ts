import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "../http";

/**
 * Account deletion against an in-memory stand-in for OpsAPI and photo storage:
 * checks what is deleted, what is kept for other people, and that a retry is safe.
 * (delete.integration.test.ts runs the same flow against a real OpsAPI.)
 */
type Row = Record<string, unknown> & { uuid: string };
const db = new Map<string, Map<string, Row>>();
const files = new Set<string>();
const calls: string[] = [];

const table = (r: string): Map<string, Row> => {
  const existing = db.get(r);
  if (existing) return existing;
  const created = new Map<string, Row>();
  db.set(r, created);
  return created;
};
const snake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const notFound = () => new HttpError("not_found", "We couldn't find that.");

vi.mock("../opsapi/client", () => ({
  listAll: vi.fn(async (resource: string, query: Record<string, string> = {}) =>
    [...table(resource).values()].filter((row) =>
      Object.entries(query).every(([k, v]) => row[k] === v),
    ),
  ),
  getRow: vi.fn(async (resource: string, id: string) => table(resource).get(id) ?? null),
  updateRow: vi.fn(async (resource: string, id: string, body: Record<string, unknown>) => {
    const row = table(resource).get(id);
    if (!row) throw notFound();
    for (const [k, v] of Object.entries(body)) if (v !== undefined) row[snake(k)] = v;
    return row;
  }),
  deleteRow: vi.fn(async (resource: string, id: string) => {
    calls.push(`delete ${resource}`);
    if (!table(resource).delete(id)) throw notFound();
    if (resource === "pets") {
      // OpsAPI cascades pet children.
      for (const t of db.values()) for (const [k, r] of t) if (r.pet_uuid === id) t.delete(k);
    }
  }),
  pluginPost: vi.fn(async (path: string, body: Record<string, unknown>) => {
    calls.push(`post ${path}`);
    if (path === "/forum/votes") {
      const target = table(body.target_type === "thread" ? "forum-threads" : "forum-replies").get(
        String(body.target_uuid),
      );
      if (!target || target.status !== "visible") throw notFound();
      for (const [k, v] of table("forum-votes"))
        if (v.target_uuid === body.target_uuid && v.user_uuid === body.user_uuid)
          table("forum-votes").delete(k);
      target.score = [...table("forum-votes").values()].filter(
        (v) => v.target_uuid === body.target_uuid,
      ).length;
    }
    return {};
  }),
}));

vi.mock("../media/storage", () => ({
  storage: () => ({
    delete: async (key: string) => {
      files.delete(key);
    },
  }),
}));

const { deleteMyData, DELETED_BODY } = await import("./delete");

let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
function insert(resource: string, row: Record<string, unknown>): Row {
  const r = { uuid: id(), ...row };
  table(resource).set(r.uuid, r);
  return r;
}

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const me = { id: ME, demo: false };

function seed() {
  const mine = insert("pets", { owner_user_uuid: ME, status: "archived" });
  insert("pet-members", { pet_uuid: mine.uuid, user_uuid: ME, role: "owner" });
  insert("weights", { pet_uuid: mine.uuid });
  insert("vaccinations", { pet_uuid: mine.uuid });
  insert("horse-cares", { pet_uuid: mine.uuid });
  insert("photos", {
    pet_uuid: mine.uuid,
    storage_key: "pets/a-full.webp",
    thumb_key: "pets/a-thumb.webp",
  });
  files.add("pets/a-full.webp").add("pets/a-thumb.webp");

  const theirs = insert("pets", { owner_user_uuid: OTHER, status: "active" });
  insert("pet-members", { pet_uuid: theirs.uuid, user_uuid: OTHER, role: "owner" });
  const shared = insert("pet-members", { pet_uuid: theirs.uuid, user_uuid: ME, role: "carer" });
  insert("weights", { pet_uuid: theirs.uuid });

  const myThread = insert("forum-threads", {
    author_user_uuid: ME,
    title: "My cat question",
    body: "secret",
    status: "visible",
    tags: "cat",
  });
  const theirThread = insert("forum-threads", {
    author_user_uuid: OTHER,
    title: "Their question",
    body: "hello",
    status: "visible",
  });
  const myReply = insert("forum-replies", {
    thread_uuid: theirThread.uuid,
    author_user_uuid: ME,
    body: "my answer",
    status: "visible",
  });
  theirThread.accepted_reply_uuid = myReply.uuid;
  const theirReply = insert("forum-replies", {
    thread_uuid: theirThread.uuid,
    author_user_uuid: OTHER,
    body: "thanks",
    status: "visible",
    score: 1,
  });
  insert("forum-votes", { target_type: "reply", target_uuid: theirReply.uuid, user_uuid: ME });
  insert("forum-reports", {
    reporter_user_uuid: ME,
    details: "my words",
    target_uuid: theirReply.uuid,
  });
  insert("forum-members", { user_uuid: ME, display_name: "Pip" });
  insert("forum-members", { user_uuid: OTHER, display_name: "Other" });
  insert("account-settings", { user_uuid: ME, totp_secret_enc: "v1.x" });
  insert("account-settings", { user_uuid: OTHER });
  return { mine, theirs, shared, myThread, theirThread, myReply, theirReply };
}

describe("deleteMyData", () => {
  beforeEach(() => {
    db.clear();
    files.clear();
    calls.length = 0;
  });

  it("refuses the shared demo account", async () => {
    await expect(deleteMyData({ id: ME, demo: true })).rejects.toSatisfy(
      (e: unknown) => e instanceof HttpError && e.code === "forbidden",
    );
  });

  it("deletes owned pets, records, photos (and files); leaves shared pets", async () => {
    const s = seed();
    const summary = await deleteMyData(me);

    expect(table("pets").has(s.mine.uuid)).toBe(false);
    expect([...table("weights").values()].every((w) => w.pet_uuid === s.theirs.uuid)).toBe(true);
    expect(table("vaccinations").size).toBe(0);
    expect(table("horse-cares").size).toBe(0);
    expect(table("photos").size).toBe(0);
    expect(files.size).toBe(0);
    // Someone else's pet survives; only my membership of it goes.
    expect(table("pets").has(s.theirs.uuid)).toBe(true);
    expect(table("pet-members").has(s.shared.uuid)).toBe(false);
    expect([...table("pet-members").values()].some((m) => m.user_uuid === OTHER)).toBe(true);
    expect(summary).toMatchObject({ pets: 1, sharedPetsLeft: 1, photos: 1, records: 3 });
    // Photo rows (after their files) go before the pet itself.
    expect(calls.indexOf("delete photos")).toBeLessThan(calls.indexOf("delete pets"));
  });

  it("scrubs and unlinks community posts, keeping other people's threads", async () => {
    const s = seed();
    await deleteMyData(me);

    expect(s.myThread).toMatchObject({ status: "removed", body: DELETED_BODY, tags: null });
    expect(s.myThread.title).not.toContain("cat");
    expect(s.myThread.author_user_uuid).not.toBe(ME);
    expect(s.myReply).toMatchObject({ status: "removed", body: DELETED_BODY });
    expect(s.myReply.author_user_uuid).not.toBe(ME);
    // Their thread and reply are untouched, apart from losing my accepted answer and vote.
    expect(s.theirThread).toMatchObject({
      status: "visible",
      body: "hello",
      accepted_reply_uuid: null,
    });
    expect(s.theirReply).toMatchObject({ status: "visible", body: "thanks", score: 0 });
    expect(calls).toContain(`post /forum/threads/${s.theirThread.uuid}/refresh`);
    expect(table("forum-votes").size).toBe(0);
    const [report] = table("forum-reports").values();
    expect(report).toMatchObject({ details: null });
    expect(report?.reporter_user_uuid).not.toBe(ME);
    expect([...table("forum-members").values()].map((m) => m.user_uuid)).toEqual([OTHER]);
  });

  it("deletes 2FA and consent settings, only mine", async () => {
    seed();
    await deleteMyData(me);
    expect([...table("account-settings").values()].map((r) => r.user_uuid)).toEqual([OTHER]);
  });

  it("keeps a paused community profile (renamed) so the pause can't be dodged", async () => {
    const member = insert("forum-members", {
      user_uuid: ME,
      display_name: "Pip",
      suspended_until: new Date(Date.now() + 86_400_000).toISOString(),
    });
    await deleteMyData(me);
    expect(table("forum-members").get(member.uuid)?.display_name).toMatch(/^Removed member /);
  });

  it("is safe to retry, and a second run finds nothing left", async () => {
    seed();
    await deleteMyData(me);
    const again = await deleteMyData(me);
    expect(again).toEqual({
      pets: 0,
      sharedPetsLeft: 0,
      photos: 0,
      records: 0,
      threads: 0,
      replies: 0,
      votes: 0,
      reports: 0,
      blocks: 0,
      communityProfile: false,
      securitySettings: 0,
    });
  });

  it("deletes blocks they made and blocks other people made of them", async () => {
    const mine = insert("forum-blocks", { blocker_user_uuid: ME, blocked_user_uuid: OTHER });
    const ofMe = insert("forum-blocks", { blocker_user_uuid: OTHER, blocked_user_uuid: ME });
    const unrelated = insert("forum-blocks", {
      blocker_user_uuid: OTHER,
      blocked_user_uuid: crypto.randomUUID(),
    });
    const summary = await deleteMyData(me);
    expect(summary.blocks).toBe(2);
    expect(table("forum-blocks").has(mine.uuid)).toBe(false);
    expect(table("forum-blocks").has(ofMe.uuid)).toBe(false);
    expect(table("forum-blocks").has(unrelated.uuid)).toBe(true);
  });
});
