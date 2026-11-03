import "server-only";
import { RECORD_INPUTS, type RecordKind } from "@pintopets/api-contract";
import { schema } from "@pintopets/db";
import { and, desc, eq, type SQL } from "drizzle-orm";
import type { PgColumn, PgTableWithColumns } from "drizzle-orm/pg-core";
import type { Actor } from "../auth";
import { db } from "../db";
import { HttpError } from "../http";
import { assertPetAccess, assertWritable, hasRole, type PetRole } from "./access";

const s = schema;

interface KindConfig {
  // Generic CRUD over twelve record tables. Every table shares id, petId,
  // createdBy, notes and timestamps, and input is validated by the kind's zod
  // schema (RECORD_INPUTS) before it reaches here, so per-table typing adds
  // nothing but casts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  table: PgTableWithColumns<any>;
  /** Newest first. */
  orderBy: PgColumn;
  /** Carers (pet sitters) may add these; everything else needs co-owner. */
  carerCanAdd: boolean;
  /** Timestamp columns stored as strings that must be returned as ISO 8601. */
  isoTimestamps?: string[];
}

export const RECORDS: Record<RecordKind, KindConfig> = {
  weights: { table: s.weightEntries, orderBy: s.weightEntries.measuredOn, carerCanAdd: true },
  vaccinations: { table: s.vaccinations, orderBy: s.vaccinations.givenOn, carerCanAdd: false },
  "parasite-treatments": {
    table: s.parasiteTreatments,
    orderBy: s.parasiteTreatments.givenOn,
    carerCanAdd: true,
  },
  medications: { table: s.medications, orderBy: s.medications.startOn, carerCanAdd: false },
  "vet-visits": { table: s.vetVisits, orderBy: s.vetVisits.visitOn, carerCanAdd: false },
  conditions: { table: s.conditions, orderBy: s.conditions.createdAt, carerCanAdd: false },
  allergies: { table: s.allergies, orderBy: s.allergies.createdAt, carerCanAdd: false },
  symptoms: {
    table: s.symptomEntries,
    orderBy: s.symptomEntries.occurredAt,
    carerCanAdd: true,
    isoTimestamps: ["occurredAt"],
  },
  "horse-care": {
    table: s.horseCareEntries,
    orderBy: s.horseCareEntries.doneOn,
    carerCanAdd: false,
  },
  "diet-items": { table: s.dietItems, orderBy: s.dietItems.createdAt, carerCanAdd: false },
  "diet-changes": { table: s.dietChanges, orderBy: s.dietChanges.changedOn, carerCanAdd: true },
  "water-notes": { table: s.waterNotes, orderBy: s.waterNotes.notedOn, carerCanAdd: true },
};

export type RecordDto = Record<string, unknown> & {
  id: string;
  petId: string;
  createdAt: string;
  updatedAt: string;
};

function toDto(kind: RecordKind, row: Record<string, unknown>): RecordDto {
  const { createdBy: _c, ...rest } = row;
  const out: Record<string, unknown> = { ...rest };
  out.createdAt = (row.createdAt as Date).toISOString();
  out.updatedAt = (row.updatedAt as Date).toISOString();
  for (const key of RECORDS[kind].isoTimestamps ?? []) {
    if (typeof out[key] === "string") out[key] = new Date(out[key] as string).toISOString();
  }
  return out as RecordDto;
}

function minRoleToAdd(kind: RecordKind): PetRole {
  return RECORDS[kind].carerCanAdd ? "carer" : "co_owner";
}

export async function listRecords(
  actor: Pick<Actor, "id">,
  petId: string,
  kind: RecordKind,
): Promise<RecordDto[]> {
  await assertPetAccess(actor, petId);
  const { table, orderBy } = RECORDS[kind];
  const rows = await db()
    .select()
    .from(table)
    .where(eq(table.petId, petId))
    .orderBy(desc(orderBy), desc(table.createdAt));
  return rows.map((r) => toDto(kind, r));
}

export async function createRecord(
  actor: Pick<Actor, "id">,
  petId: string,
  kind: RecordKind,
  input: unknown,
): Promise<RecordDto> {
  const m = await assertPetAccess(actor, petId, minRoleToAdd(kind));
  assertWritable(m);
  const values = RECORD_INPUTS[kind].parse(input) as Record<string, unknown>;
  const { table } = RECORDS[kind];
  const [row] = await db()
    .insert(table)
    .values({ ...values, petId, createdBy: actor.id })
    .returning();
  return toDto(kind, row as Record<string, unknown>);
}

async function findOwnRecord(kind: RecordKind, petId: string, recordId: string) {
  const { table } = RECORDS[kind];
  const where: SQL | undefined = and(eq(table.id, recordId), eq(table.petId, petId));
  const [row] = await db().select().from(table).where(where).limit(1);
  if (!row) throw new HttpError("not_found", "We couldn't find that record.");
  return row as Record<string, unknown>;
}

/** Co-owners and owners can change any record; carers only their own entries. */
async function assertCanChange(
  actor: Pick<Actor, "id">,
  petId: string,
  kind: RecordKind,
  recordId: string,
) {
  const m = await assertPetAccess(actor, petId);
  assertWritable(m);
  const row = await findOwnRecord(kind, petId, recordId);
  if (!hasRole(m.role, "co_owner") && row.createdBy !== actor.id) {
    throw new HttpError("forbidden", "You can only change entries you added.");
  }
}

export async function updateRecord(
  actor: Pick<Actor, "id">,
  petId: string,
  kind: RecordKind,
  recordId: string,
  patch: unknown,
): Promise<RecordDto> {
  await assertCanChange(actor, petId, kind, recordId);
  const values = RECORD_INPUTS[kind].partial().parse(patch) as Record<string, unknown>;
  const { table } = RECORDS[kind];
  if (Object.keys(values).length) {
    await db().update(table).set(values).where(eq(table.id, recordId));
  }
  return toDto(kind, await findOwnRecord(kind, petId, recordId));
}

export async function deleteRecord(
  actor: Pick<Actor, "id">,
  petId: string,
  kind: RecordKind,
  recordId: string,
): Promise<void> {
  await assertCanChange(actor, petId, kind, recordId);
  const { table } = RECORDS[kind];
  await db().delete(table).where(eq(table.id, recordId));
}
