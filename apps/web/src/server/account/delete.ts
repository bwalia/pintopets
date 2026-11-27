import "server-only";
import { RECORD_KINDS } from "@pintopets/api-contract";
import type { Actor } from "../auth";
import { mapLimit } from "../concurrency";
import { HttpError } from "../http";
import { storage } from "../media/storage";
import { deleteRow, getRow, listAll, pluginPost, updateRow } from "../opsapi/client";
import { pgTimestampToIso } from "../opsapi/mapping";
import { RECORDS } from "../pets/records";

/**
 * Deletes everything PintoPets holds about the user (UK GDPR erasure; App Store
 * guideline 5.1.1(v)). Mirrors exportMyData. The Workstation (OpsAPI) sign-in
 * is closed afterwards by DELETE /api/v1/me (server/account/reauth.ts).
 *
 * - Pets the user OWNS: every photo (stored files first, then rows), every
 *   record of every kind, then the pet (OpsAPI also cascades on the pet).
 * - Pets SHARED with the user (co-owner, carer): only their membership is
 *   removed; the pet and its records belong to its owner. Photos they added to
 *   someone else's pet stay with that pet's record.
 * - Community: posts are scrubbed in place rather than hard-deleted, so other
 *   people's discussions stay coherent and moderation history still points at
 *   something. Each of the user's threads and replies has its text replaced, is
 *   marked "removed" (never shown, like an author removing their own post) and
 *   is unlinked from them (author set to a random UUID). Their helpful votes are
 *   withdrawn (scores recounted), reports they filed are unlinked and their
 *   free-text details dropped (the report itself still counts for moderators),
 *   blocks they made, and blocks other people made of them, are deleted,
 *   and their community profile (display name) is deleted. Exception: if a
 *   moderator has paused their posting, the profile is kept (renamed to a
 *   neutral name) until the pause ends, so it can't be dodged by deleting and
 *   signing in again with the same Workstation account.
 *   Moderators' own audit-log entries (forum-mod-actions) are kept.
 * - Security: the 2FA/consent row (account-settings) is deleted LAST, so a
 *   failed run can still be retried with the user's authenticator code.
 *
 * Idempotent: every step lists what is left and treats "already gone" (404) as
 * success, so a retry after a partial failure finishes the job.
 */
export interface DeletionSummary {
  pets: number;
  sharedPetsLeft: number;
  photos: number;
  records: number;
  threads: number;
  replies: number;
  votes: number;
  reports: number;
  blocks: number;
  communityProfile: boolean;
  securitySettings: number;
}

export const DELETED_TITLE = "Deleted discussion";
export const DELETED_BODY = "[This post was deleted by its author.]";

/** Runs a delete; "not found" means someone (or an earlier attempt) got there first. */
async function gone(p: Promise<unknown>): Promise<void> {
  try {
    await p;
  } catch (error) {
    if (error instanceof HttpError && error.code === "not_found") return;
    throw error;
  }
}

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

async function deletePetFully(petId: string, counts: DeletionSummary): Promise<void> {
  const photos = await listAll("photos", { pet_uuid: petId });
  await mapLimit(photos, 2, async (photo) => {
    // Files first: if the row went first and the file delete failed, a retry
    // would no longer know the file's key.
    for (const key of [str(photo.storage_key), str(photo.thumb_key)]) {
      if (key) await storage().delete(key);
    }
    await gone(deleteRow("photos", photo.uuid));
    counts.photos++;
  });

  const kinds = await mapLimit(RECORD_KINDS, 4, async (kind) => {
    const resource = RECORDS[kind].resource;
    return { resource, rows: await listAll(resource, { pet_uuid: petId }) };
  });
  for (const { resource, rows } of kinds) {
    await mapLimit(rows, 4, async (row) => {
      await gone(deleteRow(resource, row.uuid));
      counts.records++;
    });
  }

  await gone(deleteRow("pets", petId));
  counts.pets++;
}

async function deletePets(actor: Pick<Actor, "id">, counts: DeletionSummary): Promise<void> {
  const [memberships, owned] = await Promise.all([
    listAll("pet-members", { user_uuid: actor.id }),
    // Also pets created by the user whose membership row is missing.
    listAll("pets", { owner_user_uuid: actor.id }),
  ]);
  const ownedIds = new Set(owned.map((p) => p.uuid));
  for (const m of memberships) if (m.role === "owner") ownedIds.add(String(m.pet_uuid));

  // One pet at a time: no request bursts on shared OpsAPI.
  await mapLimit([...ownedIds], 1, (petId) => deletePetFully(petId, counts));

  const shared = memberships.filter((m) => !ownedIds.has(String(m.pet_uuid)));
  await mapLimit(shared, 2, async (m) => {
    await gone(deleteRow("pet-members", m.uuid));
    counts.sharedPetsLeft++;
  });
}

async function deleteCommunity(actor: Pick<Actor, "id">, counts: DeletionSummary): Promise<void> {
  const [threads, replies, votes, reports, members, blocksMade, blocksOfThem] = await Promise.all([
    listAll("forum-threads", { author_user_uuid: actor.id }),
    listAll("forum-replies", { author_user_uuid: actor.id }),
    listAll("forum-votes", { user_uuid: actor.id }),
    listAll("forum-reports", { reporter_user_uuid: actor.id }),
    listAll("forum-members", { user_uuid: actor.id }),
    listAll("forum-blocks", { blocker_user_uuid: actor.id }),
    listAll("forum-blocks", { blocked_user_uuid: actor.id }),
  ]);

  // Votes first, while the posts they count towards are unchanged. Withdrawing
  // through /forum/votes recounts the post's score; for posts that are no
  // longer visible, the vote row is simply deleted.
  await mapLimit(votes, 2, async (v) => {
    try {
      await pluginPost("/forum/votes", {
        target_type: v.target_type,
        target_uuid: v.target_uuid,
        user_uuid: actor.id,
        voted: false,
      });
    } catch (error) {
      if (!(error instanceof HttpError && error.code === "not_found")) throw error;
      await gone(deleteRow("forum-votes", v.uuid));
    }
    counts.votes++;
  });

  await mapLimit(threads, 2, async (t) => {
    await gone(
      updateRow("forum-threads", t.uuid, {
        authorUserUuid: crypto.randomUUID(),
        title: DELETED_TITLE,
        body: DELETED_BODY,
        tags: null,
        status: "removed",
      }),
    );
    counts.threads++;
  });

  const touched = new Set<string>();
  await mapLimit(replies, 2, async (r) => {
    await gone(
      updateRow("forum-replies", r.uuid, {
        authorUserUuid: crypto.randomUUID(),
        body: DELETED_BODY,
        status: "removed",
      }),
    );
    touched.add(String(r.thread_uuid));
    counts.replies++;
  });
  // Other people's threads: drop an accepted answer that is now removed and
  // recount replies, as when an author removes their own reply.
  const replyIds = new Set(replies.map((r) => r.uuid));
  const ownThreads = new Set(threads.map((t) => t.uuid));
  await mapLimit(
    [...touched].filter((id) => !ownThreads.has(id)),
    2,
    async (threadId) => {
      const thread = await getRow("forum-threads", threadId);
      const accepted = str(thread?.accepted_reply_uuid);
      if (accepted && replyIds.has(accepted)) {
        await gone(updateRow("forum-threads", threadId, { acceptedReplyUuid: null }));
      }
      await gone(pluginPost(`/forum/threads/${threadId}/refresh`));
    },
  );

  await mapLimit(reports, 2, async (r) => {
    await gone(
      updateRow("forum-reports", r.uuid, {
        reporterUserUuid: crypto.randomUUID(),
        details: null,
      }),
    );
    counts.reports++;
  });

  await mapLimit([...blocksMade, ...blocksOfThem], 2, async (b) => {
    await gone(deleteRow("forum-blocks", b.uuid));
    counts.blocks++;
  });

  for (const m of members) {
    const until = str(m.suspended_until);
    if (until && Date.parse(pgTimestampToIso(until)) > Date.now()) {
      // Keeps only the link to the user and the pause (legitimate interest).
      await gone(
        updateRow("forum-members", m.uuid, {
          displayName: `Removed member ${m.uuid.slice(0, 8)}`,
        }),
      );
    } else {
      await gone(deleteRow("forum-members", m.uuid));
    }
    counts.communityProfile = true;
  }
}

async function deleteSecurity(actor: Pick<Actor, "id">, counts: DeletionSummary): Promise<void> {
  const rows = await listAll("account-settings", { user_uuid: actor.id });
  for (const row of rows) {
    await gone(deleteRow("account-settings", row.uuid));
    counts.securitySettings++;
  }
}

/** The shared demo account is never deleted (everyone on a test site uses it). */
export function assertDeletable(actor: Pick<Actor, "demo">): void {
  if (actor.demo) {
    throw new HttpError(
      "forbidden",
      "The shared demo account can't be deleted. Sign in with your own account to delete your data.",
    );
  }
}

export async function deleteMyData(actor: Pick<Actor, "id" | "demo">): Promise<DeletionSummary> {
  assertDeletable(actor);
  const counts: DeletionSummary = {
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
  };
  await deletePets(actor, counts);
  await deleteCommunity(actor, counts);
  await deleteSecurity(actor, counts);
  return counts;
}
