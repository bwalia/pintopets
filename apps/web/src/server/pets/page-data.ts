import "server-only";
import type { Pet } from "@pintopets/api-contract";
import { notFound } from "next/navigation";
import type { SpeciesOption } from "@/components/pets/pet-form";
import type { Actor } from "../auth";
import { HttpError } from "../http";
import { allSpecies } from "../reference-data";
import { getPet } from "./service";

/** Loads a pet for a page; malformed ids, unknown pets and other people's pets are all 404s. */
export async function loadPetForPage(actor: Actor, petId: string): Promise<Pet> {
  try {
    return await getPet(actor, petId);
  } catch (error) {
    if (error instanceof HttpError && error.code === "not_found") notFound();
    throw error;
  }
}

const SMALL = new Set(["small_pets", "birds", "reptiles_amphibians", "fish"]);

export async function speciesOptions(): Promise<SpeciesOption[]> {
  return allSpecies().map((s) => ({
    slug: s.slug,
    name: s.name,
    tracksHeightInHands: s.tracksHeightInHands,
    requiresFreeText: s.requiresFreeText,
    smallAnimal: SMALL.has(s.group),
    breeds: s.breeds.map((b) => ({ slug: b.slug, name: b.name })),
  }));
}
