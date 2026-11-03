/**
 * Pure conversions between OpsAPI rows (snake_case, `uuid`, Postgres text
 * timestamps) and PintoPets DTOs (camelCase, `id`, ISO 8601). Unit-tested.
 */
export type OpsRow = Record<string, unknown> & { uuid: string };

export function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** "2026-11-03 22:52:04.846313+00" → "2026-11-03T22:52:04.846Z". */
export function pgTimestampToIso(value: string): string {
  const normalised = value
    .trim()
    .replace(" ", "T")
    .replace(/([+-]\d{2})$/, "$1:00");
  const d = new Date(normalised);
  if (Number.isNaN(d.getTime())) throw new Error(`Unparseable timestamp: ${value}`);
  return d.toISOString();
}

/** Columns that are OpsAPI's own bookkeeping and never part of a PintoPets DTO. */
const INTERNAL = new Set(["id", "namespace_id"]);
/** Timestamp columns returned as ISO 8601. */
const TIMESTAMPS = new Set(["created_at", "updated_at", "occurred_at"]);
/** Renames beyond plain snake → camel. */
const RENAME: Record<string, string> = { uuid: "id", pet_uuid: "petId" };

/**
 * OpsAPI row → DTO. `uuid` becomes `id`; `pet_uuid` becomes `petId`; *_user_uuid
 * audit columns are kept under camelCase names (callers drop what they don't expose).
 */
export function fromRow(row: OpsRow): Record<string, unknown> & { id: string } {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (INTERNAL.has(key)) continue;
    const name = RENAME[key] ?? snakeToCamel(key);
    out[name] = TIMESTAMPS.has(key) && typeof value === "string" ? pgTimestampToIso(value) : value;
  }
  return out as Record<string, unknown> & { id: string };
}

/** DTO (camelCase) → OpsAPI body (snake_case). `undefined` values are left out. */
export function toBody(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    out[key === "petId" ? "pet_uuid" : camelToSnake(key)] = value;
  }
  return out;
}

/** OpsAPI 422 `details` ({ weight_grams: "…" }) → PintoPets issues keyed by DTO field. */
export function detailsToIssues(
  details: Record<string, string> | undefined,
): { path: string[]; message: string }[] {
  return Object.entries(details ?? {}).map(([field, message]) => ({
    path: [field === "pet_uuid" ? "petId" : snakeToCamel(field)],
    message: message.charAt(0).toUpperCase() + message.slice(1),
  }));
}
