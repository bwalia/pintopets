import "server-only";
import type { Breed, Species } from "@pintopets/api-contract";
import { allSpecies, speciesBySlug } from "./reference-data";

export async function listSpecies(): Promise<Species[]> {
  return allSpecies().map(({ breeds: _b, ...s }) => s);
}

/** Breeds A–Z with "Mixed / Unknown" last; `null` if the species doesn't exist. */
export async function listBreeds(speciesSlug: string): Promise<Breed[] | null> {
  return speciesBySlug(speciesSlug)?.breeds ?? null;
}
