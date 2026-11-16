import { access } from "node:fs/promises";
import path from "node:path";
import { PetInput } from "@pintopets/api-contract";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { env } from "@/env";
import {
  communityPosts,
  createReply,
  createThread,
  getThread,
  report,
  vote,
} from "../community/service";
import { uploadPhoto } from "../media/photos";
import { getRow, listAll } from "../opsapi/client";
import { createRecord } from "../pets/records";
import { createPet } from "../pets/service";
import { updatePreferences } from "../security/service";
import { DELETED_BODY, deleteMyData } from "./delete";

const hasOpsApi = Boolean(
  process.env.OPSAPI_API_KEY && process.env.OPSAPI_URL && process.env.TOTP_ENCRYPTION_KEY,
);
const person = (displayName: string) => ({
  id: crypto.randomUUID(),
  email: "owner@test.pintopets.app",
  displayName,
  role: "owner" as const,
  demo: false,
});
const unique = () => crypto.randomUUID().slice(0, 8);
const exists = (key: string) =>
  access(path.resolve(env().MEDIA_DIR, key)).then(
    () => true,
    () => false,
  );

describe.skipIf(!hasOpsApi)("account deletion on OpsAPI (integration)", () => {
  it("deletes pets, records, community content and settings; other people keep theirs", async () => {
    const me = person("Deleting Owner");
    const other = person("Staying Owner");

    const pet = await createPet(me, PetInput.parse({ name: "Gone", speciesSlug: "cat" }));
    await createRecord(me, pet.id, "weights", { measuredOn: "2026-11-01", weightGrams: 4000 });
    await updatePreferences(me, { consentMarketing: true });

    const theirThread = await createThread(other, {
      category: "health",
      speciesSlug: "dog",
      title: `Why is my puppy sick after eating ${unique()}?`,
      body: `She is eight months old. ${unique()}`,
      tags: [],
    });
    const myReply = await createReply(me, theirThread.id, `Try smaller meals. ${unique()}`);

    const summary = await deleteMyData(me);
    expect(summary).toMatchObject({ pets: 1, records: 1, replies: 1, communityProfile: true });

    expect(await getRow("pets", pet.id)).toBeNull();
    expect(await listAll("weights", { pet_uuid: pet.id })).toEqual([]);
    expect(await listAll("account-settings", { user_uuid: me.id })).toEqual([]);
    const reply = await getRow("forum-replies", myReply.id);
    expect(reply).toMatchObject({ status: "removed", body: DELETED_BODY });
    expect(reply?.author_user_uuid).not.toBe(me.id);
    expect((await communityPosts(me)).replies).toEqual([]);

    // Their discussion is still there, without my reply.
    const thread = await getThread(other, theirThread.id);
    expect(thread.status).toBe("visible");
    expect(thread.replies.map((r) => r.id)).not.toContain(myReply.id);

    // Retrying is harmless.
    expect((await deleteMyData(me)).pets).toBe(0);
  });

  it("removes photo files, scrubs my own threads, withdraws votes and unlinks reports", async () => {
    const me = person("Deleting Poster");
    const other = person("Staying Poster");

    const pet = await createPet(me, PetInput.parse({ name: "Snap", speciesSlug: "dog" }));
    const bytes = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 10, g: 120, b: 90 } },
    })
      .jpeg()
      .toBuffer();
    const photo = await uploadPhoto(me, pet.id, { bytes, caption: "Mine", altText: null });
    const row = await getRow("photos", photo.id);
    const keys = [String(row?.storage_key), String(row?.thumb_key)];
    for (const key of keys) expect(await exists(key)).toBe(true);

    const myThread = await createThread(me, {
      category: "behaviour",
      speciesSlug: "dog",
      title: `My dog barks at the post every morning ${unique()}`,
      body: `Any ideas for a calmer morning? ${unique()}`,
      tags: [],
    });
    const theirReplyOnMine = await createReply(
      other,
      myThread.id,
      `Try a door curtain. ${unique()}`,
    );

    const theirThread = await createThread(other, {
      category: "nutrition",
      speciesSlug: "cat",
      title: `Wet or dry food for an older cat ${unique()}?`,
      body: `She is twelve. ${unique()}`,
      tags: [],
    });
    const theirReply = await createReply(other, theirThread.id, `Mostly wet here. ${unique()}`);
    await vote(me, { targetType: "thread", targetId: theirThread.id, voted: true });
    await report(me, {
      targetType: "reply",
      targetId: theirReply.id,
      reason: "other",
      details: `My private note ${unique()}`,
    });

    const summary = await deleteMyData(me);
    expect(summary).toMatchObject({ pets: 1, photos: 1, threads: 1, votes: 1, reports: 1 });

    // Files and rows are gone.
    for (const key of keys) expect(await exists(key)).toBe(false);
    expect(await getRow("photos", photo.id)).toBeNull();

    // My thread: removed, text replaced, no longer linked to me.
    const mine = await getRow("forum-threads", myThread.id);
    expect(mine).toMatchObject({ status: "removed", body: DELETED_BODY });
    expect(mine?.author_user_uuid).not.toBe(me.id);
    // Their reply on it is untouched (it still belongs to them).
    expect(await getRow("forum-replies", theirReplyOnMine.id)).toMatchObject({
      author_user_uuid: other.id,
    });

    // My vote is withdrawn and the score recounted.
    expect(await listAll("forum-votes", { user_uuid: me.id })).toEqual([]);
    expect((await getThread(other, theirThread.id)).score).toBe(0);

    // My report still counts but no longer names me or keeps my note.
    const reports = await listAll("forum-reports", { target_uuid: theirReply.id });
    expect(reports).toHaveLength(1);
    expect(reports[0]?.reporter_user_uuid).not.toBe(me.id);
    expect(reports[0]?.details ?? null).toBeNull();
  });
});
