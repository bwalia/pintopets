import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { id, softDelete, timestamps } from "./_columns";
import { breeds, species } from "./reference";
import { users } from "./users";

export const petSex = pgEnum("pet_sex", ["male", "female", "unknown"]);
export const neuteredStatus = pgEnum("neutered_status", ["yes", "no", "unknown"]);
/** deceased = memorial mode: read-only, gentle wording, no reminders. */
export const petStatus = pgEnum("pet_status", ["active", "archived", "deceased"]);
export const petMemberRole = pgEnum("pet_member_role", ["owner", "co_owner", "carer"]);

export const pets = pgTable(
  "pets",
  {
    id: id(),
    name: text().notNull(),
    speciesId: uuid()
      .notNull()
      .references(() => species.id, { onDelete: "restrict" }),
    /** Free text when the species is "Other". */
    speciesOther: text(),
    sex: petSex().notNull().default("unknown"),
    neutered: neuteredStatus().notNull().default("unknown"),
    dateOfBirth: date({ mode: "string" }),
    dateOfBirthIsEstimate: boolean().notNull().default(false),
    colourMarkings: text(),
    /** Horses: height in inches (15.2 hh = 15 × 4 + 2 = 62). */
    heightInches: smallint(),
    passportNumber: text(),
    insuranceProvider: text(),
    insurancePolicyRef: text(),
    vetPracticeName: text(),
    vetPracticePhone: text(),
    emergencyContactName: text(),
    emergencyContactPhone: text(),
    notes: text(),
    status: petStatus().notNull().default("active"),
    deceasedOn: date({ mode: "string" }),
    /** media.id of the chosen profile photo (no FK: avoids a cycle with media). */
    profileMediaId: uuid(),
    createdBy: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("pets_species_idx").on(t.speciesId)],
);

export const petBreeds = pgTable(
  "pet_breeds",
  {
    petId: uuid()
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    breedId: uuid()
      .notNull()
      .references(() => breeds.id, { onDelete: "restrict" }),
    /** 0 = main breed, 1 = crossed with. */
    position: smallint().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.petId, t.breedId] })],
);

/** Who can see a pet. Every pet query goes through this table. */
export const petMembers = pgTable(
  "pet_members",
  {
    id: id(),
    petId: uuid()
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: petMemberRole().notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("pet_members_pet_user_uq").on(t.petId, t.userId),
    // Exactly one owner per pet. Only ownership transfer (M5) changes it.
    uniqueIndex("pet_members_one_owner_uq")
      .on(t.petId)
      .where(sql`${t.role} = 'owner'`),
    index("pet_members_user_idx").on(t.userId),
  ],
);

export const mediaKind = pgEnum("media_kind", ["image", "video", "document"]);
export const mediaStatus = pgEnum("media_status", ["pending", "ready", "rejected"]);

/**
 * Uploaded files. Bytes live in object storage (local volume now, R2 later)
 * under storageKey / thumbKey; images are re-encoded on upload, which strips
 * EXIF (including GPS location).
 */
export const media = pgTable(
  "media",
  {
    id: id(),
    petId: uuid().references(() => pets.id, { onDelete: "cascade" }),
    uploadedBy: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    kind: mediaKind().notNull(),
    status: mediaStatus().notNull().default("ready"),
    storageKey: text().notNull(),
    thumbKey: text(),
    mimeType: text().notNull(),
    bytes: integer().notNull(),
    width: integer(),
    height: integer(),
    caption: text(),
    altText: text(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("media_pet_idx").on(t.petId, t.createdAt)],
);
