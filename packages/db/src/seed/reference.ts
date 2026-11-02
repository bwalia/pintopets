import { sql } from "drizzle-orm";
import type { Database } from "../client";
import { breeds, microchipManufacturerCodes, species } from "../schema";
import {
  MANUFACTURER_CODE_SOURCES,
  MICROCHIP_MANUFACTURER_CODES,
  MIXED_OR_UNKNOWN,
  SPECIES,
  slugify,
} from "./data";

export interface SeedCounts {
  species: number;
  breeds: number;
  manufacturerCodes: number;
}

/**
 * Seeds reference data. Idempotent: safe to run on every deploy.
 * Existing rows are updated by natural key (slug / code), never duplicated.
 * Manufacturer codes an admin has edited keep their edits (insert-only).
 */
export async function seedReferenceData(db: Database): Promise<SeedCounts> {
  return db.transaction(async (tx) => {
    const speciesRows = await tx
      .insert(species)
      .values(
        SPECIES.map((s, i) => ({
          slug: s.slug,
          name: s.name,
          group: s.group,
          sortOrder: i,
          tracksHeightInHands: s.tracksHeightInHands ?? false,
          requiresFreeText: s.requiresFreeText ?? false,
        })),
      )
      .onConflictDoUpdate({
        target: species.slug,
        set: {
          name: sql`excluded.name`,
          group: sql`excluded.group`,
          sortOrder: sql`excluded.sort_order`,
          tracksHeightInHands: sql`excluded.tracks_height_in_hands`,
          requiresFreeText: sql`excluded.requires_free_text`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: species.id, slug: species.slug });

    const speciesIdBySlug = new Map(speciesRows.map((r) => [r.slug, r.id]));

    const breedValues = SPECIES.flatMap((s) => {
      const speciesId = speciesIdBySlug.get(s.slug);
      if (!speciesId) throw new Error(`Species ${s.slug} was not seeded`);
      return [
        ...s.breeds.map((name) => ({
          speciesId,
          slug: slugify(name),
          name,
          isMixedOrUnknown: false,
        })),
        {
          speciesId,
          slug: slugify(MIXED_OR_UNKNOWN),
          name: MIXED_OR_UNKNOWN,
          isMixedOrUnknown: true,
        },
      ];
    });

    await tx
      .insert(breeds)
      .values(breedValues)
      .onConflictDoUpdate({
        target: [breeds.speciesId, breeds.slug],
        set: {
          name: sql`excluded.name`,
          isMixedOrUnknown: sql`excluded.is_mixed_or_unknown`,
          updatedAt: sql`now()`,
        },
      });

    await tx
      .insert(microchipManufacturerCodes)
      .values(
        MICROCHIP_MANUFACTURER_CODES.map((c) => ({
          code: c.code,
          manufacturer: c.manufacturer,
          notes: c.notes ?? null,
          source: MANUFACTURER_CODE_SOURCES[c.source],
        })),
      )
      .onConflictDoNothing({ target: microchipManufacturerCodes.code });

    return {
      species: speciesRows.length,
      breeds: breedValues.length,
      manufacturerCodes: MICROCHIP_MANUFACTURER_CODES.length,
    };
  });
}
