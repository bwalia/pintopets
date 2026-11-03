import "server-only";
import { RECORD_INPUTS, type RecordKind } from "@pintopets/api-contract";
import type { Actor } from "../auth";
import { HttpError } from "../http";
import {
  createRow,
  deleteRow,
  fromRow,
  getRow,
  listAll,
  type Resource,
  updateRow,
} from "../opsapi/client";
import type { OpsRow } from "../opsapi/mapping";
import { assertPetAccess, assertWritable, hasRole, type PetRole } from "./access";

interface KindConfig {
  /** Plugin resource (opsapi/pintopets/api/*.lua). */
  resource: Resource;
  /** Newest first, by this column. */
  sort: string;
  /** Carers (pet sitters) may add these; everything else needs co-owner. */
  carerCanAdd: boolean;
  /** Plugin columns PintoPets sets itself (not in the API input). */
  fixed?: Record<string, unknown>;
}

export const RECORDS: Record<RecordKind, KindConfig> = {
  weights: { resource: "weights", sort: "measured_on", carerCanAdd: true },
  vaccinations: { resource: "vaccinations", sort: "given_on", carerCanAdd: false },
  "parasite-treatments": { resource: "parasite-treatments", sort: "given_on", carerCanAdd: true },
  medications: { resource: "medications", sort: "start_on", carerCanAdd: false },
  "vet-visits": { resource: "vet-visits", sort: "visit_on", carerCanAdd: false },
  conditions: { resource: "conditions", sort: "created_at", carerCanAdd: false },
  allergies: { resource: "allergies", sort: "created_at", carerCanAdd: false },
  symptoms: {
    resource: "symptoms",
    sort: "occurred_at",
    carerCanAdd: true,
    fixed: { source: "manual" },
  },
  "horse-care": { resource: "horse-cares", sort: "done_on", carerCanAdd: false },
  "diet-items": { resource: "diet-items", sort: "created_at", carerCanAdd: false },
  "diet-changes": { resource: "diet-changes", sort: "changed_on", carerCanAdd: true },
  "water-notes": { resource: "water-notes", sort: "noted_on", carerCanAdd: true },
};

export type RecordDto = Record<string, unknown> & {
  id: string;
  petId: string;
  createdAt: string;
  updatedAt: string;
};

function toDto(row: OpsRow): RecordDto {
  const { createdByUserUuid: _c, source: _s, ...rest } = fromRow(row);
  return rest as RecordDto;
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
  const { resource, sort } = RECORDS[kind];
  const rows = await listAll(resource, { pet_uuid: petId, sort, order: "desc" });
  return rows.map(toDto);
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
  const { resource, fixed } = RECORDS[kind];
  const row = await createRow(resource, {
    ...values,
    ...fixed,
    petId,
    createdByUserUuid: actor.id,
  });
  return toDto(row);
}

async function findOwnRecord(kind: RecordKind, petId: string, recordId: string): Promise<OpsRow> {
  const row = await getRow(RECORDS[kind].resource, recordId);
  if (!row || row.pet_uuid !== petId)
    throw new HttpError("not_found", "We couldn't find that record.");
  return row;
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
  if (!hasRole(m.role, "co_owner") && row.created_by_user_uuid !== actor.id) {
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
  if (Object.keys(values).length === 0) return toDto(await findOwnRecord(kind, petId, recordId));
  return toDto(await updateRow(RECORDS[kind].resource, recordId, values));
}

export async function deleteRecord(
  actor: Pick<Actor, "id">,
  petId: string,
  kind: RecordKind,
  recordId: string,
): Promise<void> {
  await assertCanChange(actor, petId, kind, recordId);
  await deleteRow(RECORDS[kind].resource, recordId);
}
