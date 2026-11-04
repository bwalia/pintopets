import "server-only";
import { RECORD_KINDS } from "@pintopets/api-contract";
import type { Actor } from "../auth";
import { mapLimit } from "../concurrency";
import { listPhotos } from "../media/photos";
import { listRecords } from "../pets/records";
import { listPets } from "../pets/service";
import { securityStatus } from "../security/service";

/**
 * Everything PintoPets holds about the user's pets (UK GDPR access/portability).
 * Photo files are referenced by URL; secrets are never included.
 */
export async function exportMyData(actor: Pick<Actor, "id" | "email" | "displayName">) {
  const statuses = ["active", "archived", "deceased"] as const;
  const pets = (await Promise.all(statuses.map((s) => listPets(actor, s)))).flat();
  const security = await securityStatus(actor);
  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: actor.id,
      email: actor.email,
      displayName: actor.displayName,
      twoFactorEnabled: security.totpEnabled,
      consents: { aiLearning: security.consentAiLearning, marketing: security.consentMarketing },
    },
    // One pet at a time, a few record lists at once: no request bursts on OpsAPI.
    pets: await mapLimit(pets, 1, async (pet) => ({
      ...pet,
      records: Object.fromEntries(
        await mapLimit(
          RECORD_KINDS,
          4,
          async (kind) => [kind, await listRecords(actor, pet.id, kind)] as const,
        ),
      ),
      photos: await listPhotos(actor, pet.id),
    })),
  };
}
