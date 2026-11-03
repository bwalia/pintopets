import "server-only";
import { schema } from "@pintopets/db";
import { and, eq, isNull } from "drizzle-orm";
import type { Actor } from "../auth";
import { db } from "../db";
import { HttpError } from "../http";

const { pets, petMembers } = schema;

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

/**
 * The single permission check for pet data (section 5: users only access pets
 * they are members of). Unknown pets and pets the user is not a member of both
 * return 404, so the API never reveals that someone else's pet exists.
 */
export async function assertPetAccess(
  actor: Pick<Actor, "id">,
  petId: string,
  min: PetRole = "carer",
): Promise<Membership> {
  const [m] = await db()
    .select({ role: petMembers.role, status: pets.status })
    .from(petMembers)
    .innerJoin(pets, eq(pets.id, petMembers.petId))
    .where(
      and(eq(petMembers.petId, petId), eq(petMembers.userId, actor.id), isNull(pets.deletedAt)),
    )
    .limit(1);
  if (!m) throw new HttpError("not_found", "We couldn't find that pet.");
  if (!hasRole(m.role, min)) {
    throw new HttpError("forbidden", "You don't have permission to do that for this pet.");
  }
  return m;
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
