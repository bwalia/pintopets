import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./_columns";
import { pets } from "./pets";
import { users } from "./users";

/**
 * Pet records: health (section 4.4), diet (4.5) and weight. One table per
 * kind; the API and UI treat them uniformly through the records registry
 * (apps/web/src/server/records). The app records what the vet prescribed and
 * never suggests doses.
 */
const base = () => ({
  id: id(),
  petId: uuid()
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  createdBy: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  notes: text(),
  ...timestamps,
});

export const severity = pgEnum("severity", ["mild", "moderate", "severe"]);

export const weightEntries = pgTable(
  "weight_entries",
  {
    ...base(),
    measuredOn: date({ mode: "string" }).notNull(),
    /** Grams, so a hamster (40 g) and a horse (600 kg) fit the same column. */
    weightGrams: integer().notNull(),
  },
  (t) => [index("weight_entries_pet_idx").on(t.petId, t.measuredOn)],
);

export const vaccinations = pgTable(
  "vaccinations",
  {
    ...base(),
    vaccine: text().notNull(),
    givenOn: date({ mode: "string" }).notNull(),
    batchNumber: text(),
    vet: text(),
    nextDueOn: date({ mode: "string" }),
  },
  (t) => [index("vaccinations_pet_idx").on(t.petId, t.givenOn)],
);

export const parasiteKind = pgEnum("parasite_kind", [
  "flea",
  "worm",
  "tick",
  "flea_and_tick",
  "lungworm",
  "mite",
  "other",
]);

export const parasiteTreatments = pgTable(
  "parasite_treatments",
  {
    ...base(),
    kind: parasiteKind().notNull(),
    product: text().notNull(),
    givenOn: date({ mode: "string" }).notNull(),
    nextDueOn: date({ mode: "string" }),
  },
  (t) => [index("parasite_treatments_pet_idx").on(t.petId, t.givenOn)],
);

export const medications = pgTable(
  "medications",
  {
    ...base(),
    name: text().notNull(),
    /** Exactly as written by the vet. Never computed or suggested. */
    doseAsPrescribed: text().notNull(),
    frequency: text().notNull(),
    startOn: date({ mode: "string" }).notNull(),
    endOn: date({ mode: "string" }),
    prescribedBy: text(),
    remindersEnabled: boolean().notNull().default(true),
  },
  (t) => [index("medications_pet_idx").on(t.petId, t.startOn)],
);

export const vetVisits = pgTable(
  "vet_visits",
  {
    ...base(),
    visitOn: date({ mode: "string" }).notNull(),
    practice: text(),
    vetName: text(),
    reason: text().notNull(),
    outcome: text(),
    /** Invoice total in pence (GBP). */
    costPence: integer(),
    followUpOn: date({ mode: "string" }),
  },
  (t) => [index("vet_visits_pet_idx").on(t.petId, t.visitOn)],
);

export const conditionStatus = pgEnum("condition_status", ["active", "managed", "resolved"]);

export const conditions = pgTable(
  "conditions",
  {
    ...base(),
    name: text().notNull(),
    diagnosedOn: date({ mode: "string" }),
    status: conditionStatus().notNull().default("active"),
  },
  (t) => [index("conditions_pet_idx").on(t.petId)],
);

export const allergies = pgTable(
  "allergies",
  {
    ...base(),
    allergen: text().notNull(),
    reaction: text(),
    severity: severity().notNull().default("mild"),
  },
  (t) => [index("allergies_pet_idx").on(t.petId)],
);

export const symptomSource = pgEnum("symptom_source", ["manual", "ai_chat"]);

/** Symptom diary: quick log entries the owner can show the vet (and the AI can read). */
export const symptomEntries = pgTable(
  "symptom_entries",
  {
    ...base(),
    occurredAt: timestamp({ withTimezone: true, mode: "string" }).notNull(),
    symptom: text().notNull(),
    severity: severity().notNull().default("mild"),
    source: symptomSource().notNull().default("manual"),
  },
  (t) => [index("symptom_entries_pet_idx").on(t.petId, t.occurredAt)],
);

export const horseCareKind = pgEnum("horse_care_kind", ["farrier", "dental", "worm_egg_count"]);

export const horseCareEntries = pgTable(
  "horse_care_entries",
  {
    ...base(),
    kind: horseCareKind().notNull(),
    doneOn: date({ mode: "string" }).notNull(),
    provider: text(),
    result: text(),
    nextDueOn: date({ mode: "string" }),
  },
  (t) => [index("horse_care_entries_pet_idx").on(t.petId, t.doneOn)],
);

export const dietItemKind = pgEnum("diet_item_kind", ["food", "treat", "supplement"]);

export const dietItems = pgTable(
  "diet_items",
  {
    ...base(),
    kind: dietItemKind().notNull(),
    brand: text(),
    product: text().notNull(),
    amount: text(),
    frequency: text(),
    startedOn: date({ mode: "string" }),
    endedOn: date({ mode: "string" }),
  },
  (t) => [index("diet_items_pet_idx").on(t.petId)],
);

export const dietChanges = pgTable(
  "diet_changes",
  {
    ...base(),
    changedOn: date({ mode: "string" }).notNull(),
    description: text().notNull(),
    reaction: text(),
  },
  (t) => [index("diet_changes_pet_idx").on(t.petId, t.changedOn)],
);

/** Water intake notes (useful for kidney and urinary problems). */
export const waterNotes = pgTable(
  "water_notes",
  {
    ...base(),
    notedOn: date({ mode: "string" }).notNull(),
    observation: text().notNull(),
  },
  (t) => [index("water_notes_pet_idx").on(t.petId, t.notedOn)],
);
