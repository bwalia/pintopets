import { z } from "zod";
import { IsoDate, OptionalIsoDate, optionalText, Uuid } from "../common";
import { ApiError } from "../errors";
import { registry } from "../registry";

/**
 * Pet records (health 4.4, diet 4.5, weight). Every kind shares one API shape:
 *   GET/POST   /api/v1/pets/{petId}/records/{kind}
 *   PATCH/DELETE /api/v1/pets/{petId}/records/{kind}/{recordId}
 * The app records what the vet prescribed; it never suggests doses.
 */
const notes = optionalText(4000);
const severity = z.enum(["mild", "moderate", "severe"]);

export const RECORD_INPUTS = {
  weights: z.object({
    measuredOn: IsoDate,
    weightGrams: z.number().int().min(1).max(2_000_000),
    notes,
  }),
  vaccinations: z.object({
    vaccine: z.string().trim().min(1, "Please enter the vaccine").max(120),
    givenOn: IsoDate,
    batchNumber: optionalText(60),
    vet: optionalText(120),
    nextDueOn: OptionalIsoDate,
    notes,
  }),
  "parasite-treatments": z.object({
    kind: z.enum(["flea", "worm", "tick", "flea_and_tick", "lungworm", "mite", "other"]),
    product: z.string().trim().min(1, "Please enter the product").max(120),
    givenOn: IsoDate,
    nextDueOn: OptionalIsoDate,
    notes,
  }),
  medications: z.object({
    name: z.string().trim().min(1, "Please enter the medicine").max(120),
    doseAsPrescribed: z
      .string()
      .trim()
      .min(1, "Copy the dose exactly as your vet wrote it")
      .max(300),
    frequency: z.string().trim().min(1, "Please enter how often").max(120),
    startOn: IsoDate,
    endOn: OptionalIsoDate,
    prescribedBy: optionalText(120),
    remindersEnabled: z.boolean().default(true),
    notes,
  }),
  "vet-visits": z.object({
    visitOn: IsoDate,
    practice: optionalText(120),
    vetName: optionalText(120),
    reason: z.string().trim().min(1, "Please enter the reason").max(300),
    outcome: optionalText(2000),
    costPence: z.number().int().min(0).max(100_000_000).nullish(),
    followUpOn: OptionalIsoDate,
    notes,
  }),
  conditions: z.object({
    name: z.string().trim().min(1, "Please enter the condition").max(120),
    diagnosedOn: OptionalIsoDate,
    status: z.enum(["active", "managed", "resolved"]).default("active"),
    notes,
  }),
  allergies: z.object({
    allergen: z.string().trim().min(1, "Please enter what they react to").max(120),
    reaction: optionalText(300),
    severity: severity.default("mild"),
    notes,
  }),
  symptoms: z.object({
    occurredAt: z.iso.datetime({ offset: true }),
    symptom: z.string().trim().min(1, "Please describe the symptom").max(300),
    severity: severity.default("mild"),
    notes,
  }),
  "horse-care": z.object({
    kind: z.enum(["farrier", "dental", "worm_egg_count"]),
    doneOn: IsoDate,
    provider: optionalText(120),
    result: optionalText(300),
    nextDueOn: OptionalIsoDate,
    notes,
  }),
  "diet-items": z.object({
    kind: z.enum(["food", "treat", "supplement"]),
    brand: optionalText(120),
    product: z.string().trim().min(1, "Please enter the product").max(120),
    amount: optionalText(120),
    frequency: optionalText(120),
    startedOn: OptionalIsoDate,
    endedOn: OptionalIsoDate,
    notes,
  }),
  "diet-changes": z.object({
    changedOn: IsoDate,
    description: z.string().trim().min(1, "Please describe the change").max(500),
    reaction: optionalText(500),
    notes,
  }),
  "water-notes": z.object({
    notedOn: IsoDate,
    observation: z.string().trim().min(1, "Please add what you noticed").max(500),
    notes,
  }),
} as const;

export type RecordKind = keyof typeof RECORD_INPUTS;
export const RECORD_KINDS = Object.keys(RECORD_INPUTS) as RecordKind[];
export const RecordKindSchema = z.enum(RECORD_KINDS as [RecordKind, ...RecordKind[]]);

export type RecordInput<K extends RecordKind> = z.output<(typeof RECORD_INPUTS)[K]>;

export const RecordMeta = z.object({
  id: Uuid,
  petId: Uuid,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export function recordOutput<K extends RecordKind>(kind: K) {
  return RECORD_INPUTS[kind].extend(RecordMeta.shape);
}

/** PATCH bodies: every field optional, same rules. */
export function recordUpdate<K extends RecordKind>(kind: K) {
  return RECORD_INPUTS[kind].partial();
}

// ── OpenAPI: one documented path pair per kind (named schemas for codegen) ──
const pascal = (k: string) =>
  k
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");

const json = <T extends z.ZodType>(schema: T) => ({ content: { "application/json": { schema } } });
const errors = {
  401: { description: "Not signed in", ...json(ApiError) },
  403: { description: "No access", ...json(ApiError) },
  404: { description: "Not found", ...json(ApiError) },
  422: { description: "Validation failed", ...json(ApiError) },
};

for (const kind of RECORD_KINDS) {
  const name = pascal(kind);
  const input = RECORD_INPUTS[kind].meta({ id: `${name}Input` });
  const output = recordOutput(kind).meta({ id: name });
  const list = z.object({ data: z.array(output) }).meta({ id: `${name}ListResponse` });
  const one = z.object({ data: output }).meta({ id: `${name}Response` });
  const petParams = z.object({ petId: Uuid });
  const recParams = z.object({ petId: Uuid, recordId: Uuid });
  const tags = ["Pet records"];

  registry.registerPath({
    method: "get",
    path: `/api/v1/pets/{petId}/records/${kind}`,
    operationId: `list${name}`,
    tags,
    request: { params: petParams },
    responses: { 200: { description: "Records, newest first", ...json(list) }, ...errors },
  });
  registry.registerPath({
    method: "post",
    path: `/api/v1/pets/{petId}/records/${kind}`,
    operationId: `create${name}`,
    tags,
    request: { params: petParams, body: json(input) },
    responses: { 201: { description: "Created", ...json(one) }, ...errors },
  });
  registry.registerPath({
    method: "patch",
    path: `/api/v1/pets/{petId}/records/${kind}/{recordId}`,
    operationId: `update${name}`,
    tags,
    request: { params: recParams, body: json(recordUpdate(kind)) },
    responses: { 200: { description: "Updated", ...json(one) }, ...errors },
  });
  registry.registerPath({
    method: "delete",
    path: `/api/v1/pets/{petId}/records/${kind}/{recordId}`,
    operationId: `delete${name}`,
    tags,
    request: { params: recParams },
    responses: { 204: { description: "Deleted" }, ...errors },
  });
}
