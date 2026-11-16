import { PetInput } from "@pintopets/api-contract";
import { describe, expect, it } from "vitest";
import { communityPosts, createReply, createThread, getThread } from "../community/service";
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
});
