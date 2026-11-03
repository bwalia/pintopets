import "server-only";
import { Uuid } from "@pintopets/api-contract";
import type { Actor } from "../auth";
import { HttpError } from "../http";
import { getRow, listPage } from "../opsapi/client";

export type PetRole = "owner" | "co_owner" | "carer";
export type PetStatus = "active" | "archived" | "deceased";

const RANK: Record<PetRole, number> = { carer: 1, co_owner: 2, owner: 3 };

export function hasRole(role: PetRole, min: PetRole): boolean {
  return RANK[role] >= RANK[min];
}

export interface Membership {
  role: PetRole;
  status: PetStatus;
}

const notFound = () => new HttpError("not_found", "We couldn't find that pet.");

/**
 * The single permission check for pet data. OpsAPI scopes rows by workspace,
 * and every PintoPets owner shares the one `pintopets` workspace, so who may
 * see which pet is decided here, from the plugin's pet-members rows. Unknown
 * pets and pets the user isn't a member of are both 404s, so the API never
 * reveals that someone else's pet exists.
 */
export async function assertPetAccess(
  actor: Pick<Actor, "id">,
  petId: string,
  min: PetRole = "carer",
): Promise<Membership> {
  if (!Uuid.safeParse(petId).success) throw notFound();
  const [member] = await listPage("pet-members", {
    pet_uuid: petId,
    user_uuid: actor.id,
    per_page: 1,
  });
  if (!member) throw notFound();
  const pet = await getRow("pets", petId);
  if (!pet) throw notFound();
  const role = member.role as PetRole;
  if (!hasRole(role, min)) {
    throw new HttpError("forbidden", "You don't have permission to do that for this pet.");
  }
  return { role, status: pet.status as PetStatus };
}

/** Memorial mode: a pet that has passed away keeps its records read-only. */
export function assertWritable(m: Membership): void {
  if (m.status === "deceased") {
    throw new HttpError(
      "conflict",
      "This pet's records are in memorial mode and can't be changed.",
    );
  }
}
