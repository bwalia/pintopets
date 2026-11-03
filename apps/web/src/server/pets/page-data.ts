import "server-only";
import type { Pet } from "@pintopets/api-contract";
import { Uuid } from "@pintopets/api-contract";
import { schema } from "@pintopets/db";
import { asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { SpeciesOption } from "@/components/pets/pet-form";
import type { Actor } from "../auth";
import { db } from "../db";
import { HttpError } from "../http";
import { getPet } from "./service";

/** Loads a pet for a page; malformed ids, unknown pets and other people's pets are all 404s. */
export async function loadPetForPage(actor: Actor, petId: string): Promise<Pet> {
  if (!Uuid.safeParse(petId).success) notFound();
  try {
    return await getPet(actor, petId);
  } catch (error) {
    if (error instanceof HttpError && error.code === "not_found") notFound();
    throw error;
  }
}

const SMALL = new Set(["small_pets", "birds", "reptiles_amphibians", "fish"]);

export async function speciesOptions(): Promise<SpeciesOption[]> {
  const [sp, br] = await Promise.all([
    db().select().from(schema.species).orderBy(asc(schema.species.sortOrder)),
    db()
      .select()
      .from(schema.breeds)
      .orderBy(asc(schema.breeds.isMixedOrUnknown), asc(schema.breeds.name)),
  ]);
  return sp.map((s) => ({
    slug: s.slug,
    name: s.name,
    tracksHeightInHands: s.tracksHeightInHands,
    requiresFreeText: s.requiresFreeText,
    smallAnimal: SMALL.has(s.group),
    breeds: br.filter((b) => b.speciesId === s.id).map((b) => ({ slug: b.slug, name: b.name })),
  }));
}

// Keep the client-side carer list in step with the server's permissions.
export { RECORDS } from "./records";
