import "server-only";
import type { Breed, Species } from "@pintopets/api-contract";
import { MIXED_OR_UNKNOWN, SPECIES, slugify } from "@pintopets/db/seed-data";

/**
 * Species and breeds are static reference data, kept in code (packages/db
 * seed data) rather than in OpsAPI: they change with releases, not at runtime.
 */
export interface SpeciesInfo extends Species {
  breeds: Breed[];
}

const ALL: SpeciesInfo[] = SPECIES.map((s) => ({
  slug: s.slug,
  name: s.name,
  group: s.group,
  tracksHeightInHands: s.tracksHeightInHands ?? false,
  requiresFreeText: s.requiresFreeText ?? false,
  breeds: [
    ...[...s.breeds]
      .sort((a, b) => a.localeCompare(b, "en-GB"))
      .map((name) => ({ slug: slugify(name), name, isMixedOrUnknown: false })),
    { slug: slugify(MIXED_OR_UNKNOWN), name: MIXED_OR_UNKNOWN, isMixedOrUnknown: true },
  ],
}));

const BY_SLUG = new Map(ALL.map((s) => [s.slug, s]));

export function allSpecies(): SpeciesInfo[] {
  return ALL;
}

export function speciesBySlug(slug: string): SpeciesInfo | undefined {
  return BY_SLUG.get(slug);
}
