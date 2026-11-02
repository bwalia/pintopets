import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./_columns";

/**
 * Species groups match the community forums (section 4.10), so a pet's species
 * always maps to exactly one forum.
 */
export const speciesGroup = pgEnum("species_group", [
  "dogs",
  "cats",
  "horses",
  "rabbits",
  "small_pets",
  "birds",
  "reptiles_amphibians",
  "fish",
  "farm",
  "other",
]);

export const species = pgTable(
  "species",
  {
    id: id(),
    slug: text().notNull(),
    name: text().notNull(),
    group: speciesGroup().notNull(),
    sortOrder: smallint().notNull().default(0),
    /** Horses: height is recorded in hands. */
    tracksHeightInHands: boolean().notNull().default(false),
    /** "Other": the owner must type the species name. */
    requiresFreeText: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("species_slug_uq").on(t.slug)],
);

export const breeds = pgTable(
  "breeds",
  {
    id: id(),
    speciesId: uuid()
      .notNull()
      .references(() => species.id, { onDelete: "restrict" }),
    slug: text().notNull(),
    name: text().notNull(),
    /** The "Mixed / Unknown" option every species has. */
    isMixedOrUnknown: boolean().notNull().default(false),
    ...timestamps,
  },
  // The unique index also serves "breeds for a species" lookups (leading column).
  (t) => [uniqueIndex("breeds_species_slug_uq").on(t.speciesId, t.slug)],
);

/**
 * ICAR manufacturer codes (900–998) used in ISO 11784 chip numbers.
 * Admins can edit this table (section 4.6). Code 999 is reserved for test
 * transponders and is rejected by validation, so it is not allowed here.
 */
export const microchipManufacturerCodes = pgTable(
  "microchip_manufacturer_codes",
  {
    id: id(),
    code: integer().notNull(),
    manufacturer: text().notNull(),
    notes: text(),
    /** Where the mapping came from, so admins can re-check it. */
    source: text().notNull(),
    active: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("microchip_manufacturer_codes_code_uq").on(t.code),
    check("microchip_manufacturer_codes_code_range", sql`${t.code} between 900 and 998`),
  ],
);
