import "server-only";
import type { Breed, Species } from "@pintopets/api-contract";
import { schema } from "@pintopets/db";
import { asc, eq } from "drizzle-orm";
import { db } from "./db";

const { breeds, species } = schema;

export async function listSpecies(): Promise<Species[]> {
  return db()
    .select({
      id: species.id,
      slug: species.slug,
      name: species.name,
      group: species.group,
      tracksHeightInHands: species.tracksHeightInHands,
      requiresFreeText: species.requiresFreeText,
    })
    .from(species)
    .orderBy(asc(species.sortOrder));
}

/** Breeds A–Z with "Mixed / Unknown" last; `null` if the species doesn't exist. */
export async function listBreeds(speciesSlug: string): Promise<Breed[] | null> {
  const [found] = await db()
    .select({ id: species.id })
    .from(species)
    .where(eq(species.slug, speciesSlug))
    .limit(1);
  if (!found) return null;

  return db()
    .select({
      id: breeds.id,
      slug: breeds.slug,
      name: breeds.name,
      isMixedOrUnknown: breeds.isMixedOrUnknown,
    })
    .from(breeds)
    .where(eq(breeds.speciesId, found.id))
    .orderBy(asc(breeds.isMixedOrUnknown), asc(breeds.name));
}
