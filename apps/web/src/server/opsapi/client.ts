import "server-only";
import { createClient, OpsApiError, type OpsApiClient } from "@opsapi/client";
import { env } from "@/env";
import { HttpError } from "../http";
import { detailsToIssues, fromRow, type OpsRow, toBody } from "./mapping";
import type { paths } from "./pintopets";

/**
 * PintoPets' data lives in OpsAPI, in the `pintopets` plugin (opsapi/pintopets):
 * one workspace, called by this server with an API key scoped to the plugin's
 * modules. OpsAPI scopes data by workspace, not by person, so per-owner privacy
 * is enforced here (pets/access.ts) before any call is made.
 */
let instance: OpsApiClient<paths> | undefined;

export function opsapi(): OpsApiClient<paths> {
  instance ??= createClient<paths>({
    baseUrl: env().OPSAPI_URL,
    token: env().OPSAPI_API_KEY,
    namespace: env().OPSAPI_NAMESPACE,
    timeoutMs: 10_000,
    retries: 2,
  });
  return instance;
}

/** Plugin resources (path segment under /api/v2/pintopets). */
export type Resource =
  | "pets"
  | "pet-members"
  | "weights"
  | "vaccinations"
  | "parasite-treatments"
  | "medications"
  | "vet-visits"
  | "conditions"
  | "allergies"
  | "symptoms"
  | "horse-cares"
  | "diet-items"
  | "diet-changes"
  | "water-notes"
  | "photos"
  | "account-settings"
  | "forum-members"
  | "forum-threads"
  | "forum-replies"
  | "forum-votes"
  | "forum-reports"
  | "forum-mod-actions";

/** OpsAPI failures → PintoPets' standard API errors. */
export function toHttpError(error: unknown): unknown {
  if (!(error instanceof OpsApiError)) return error;
  if (error.status === 404) return new HttpError("not_found", "We couldn't find that.");
  if (error.status === 422) {
    return new HttpError(
      "validation_failed",
      "Some of the information sent was not valid.",
      detailsToIssues(error.details),
    );
  }
  if (error.status === 409) return new HttpError("conflict", "That conflicts with existing data.");
  if (error.status === 0 || error.status >= 500) {
    return new HttpError(
      "service_unavailable",
      "Our pet records service is unavailable. Please try again shortly.",
    );
  }
  // 400/401/403 from OpsAPI mean PintoPets is misconfigured (key, scopes or
  // workspace), not that the user did something wrong: keep the original
  // error so it is logged and reported, and the user sees a generic 500.
  return error;
}

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toHttpError(error);
  }
}

interface Envelope {
  data?: unknown;
  meta?: { total_pages?: number } | null;
}

// The store addresses resources by name, so it calls the client's typed
// methods with a computed path; the generated `paths` still type every
// specific call made elsewhere. Responses are mapped and validated by callers.
type LooseClient = {
  GET(path: string, init?: object): Promise<{ data?: unknown }>;
  POST(path: string, init?: object): Promise<{ data?: unknown }>;
  PUT(path: string, init?: object): Promise<{ data?: unknown }>;
  DELETE(path: string, init?: object): Promise<{ data?: unknown }>;
};
const loose = () => opsapi() as unknown as LooseClient;
const base = (r: Resource) => `/api/v2/pintopets/${r}`;

export type Query = Record<string, string | number>;

/** All rows matching `query`, following pagination (capped as a safety net). */
export async function listAll(
  resource: Resource,
  query: Query = {},
  maxPages = 20,
): Promise<OpsRow[]> {
  const rows: OpsRow[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const { data } = await call(() =>
      loose().GET(base(resource), { params: { query: { ...query, page, per_page: 100 } } }),
    );
    const env = (data ?? {}) as Envelope;
    const batch = Array.isArray(env.data) ? (env.data as OpsRow[]) : [];
    rows.push(...batch);
    if (batch.length < 100 || page >= (env.meta?.total_pages ?? page)) break;
  }
  return rows;
}

export async function listPage(resource: Resource, query: Query): Promise<OpsRow[]> {
  const { data } = await call(() => loose().GET(base(resource), { params: { query } }));
  const env = (data ?? {}) as Envelope;
  return Array.isArray(env.data) ? (env.data as OpsRow[]) : [];
}

/**
 * The plugin's read views (opsapi/pintopets/api/views.lua): one SQL query each,
 * instead of a request per pet.
 */
export async function userView(
  view: "pets" | "due",
  userUuid: string,
  query: Query = {},
): Promise<OpsRow[]> {
  const { data } = await call(() =>
    loose().GET(`/api/v2/pintopets/users/{user_uuid}/${view}`, {
      params: { path: { user_uuid: userUuid }, query },
    }),
  );
  const env = (data ?? {}) as Envelope;
  return Array.isArray(env.data) ? (env.data as OpsRow[]) : [];
}

/**
 * The plugin's hand-written routes (e.g. forum.lua). `path` is under
 * /api/v2/pintopets and is built from validated values only.
 */
export async function pluginGet<T = unknown>(
  path: string,
  query: Query = {},
): Promise<{ data: T; meta: Record<string, unknown> | null }> {
  const { data } = await call(() => loose().GET(`/api/v2/pintopets${path}`, { params: { query } }));
  const env = (data ?? {}) as Envelope;
  return { data: env.data as T, meta: (env.meta as Record<string, unknown>) ?? null };
}

export async function pluginPost<T = unknown>(
  path: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const { data } = await call(() => loose().POST(`/api/v2/pintopets${path}`, { body }));
  return ((data ?? {}) as Envelope).data as T;
}

export async function getRow(resource: Resource, uuid: string): Promise<OpsRow | null> {
  try {
    const { data } = await call(() =>
      loose().GET(`${base(resource)}/{id}`, { params: { path: { id: uuid } } }),
    );
    return ((data ?? {}) as Envelope).data as OpsRow;
  } catch (error) {
    if (error instanceof HttpError && error.code === "not_found") return null;
    throw error;
  }
}

export async function createRow(
  resource: Resource,
  body: Record<string, unknown>,
): Promise<OpsRow> {
  const { data } = await call(() => loose().POST(base(resource), { body: toBody(body) }));
  return ((data ?? {}) as Envelope).data as OpsRow;
}

export async function updateRow(
  resource: Resource,
  uuid: string,
  body: Record<string, unknown>,
): Promise<OpsRow> {
  const { data } = await call(() =>
    loose().PUT(`${base(resource)}/{id}`, { params: { path: { id: uuid } }, body: toBody(body) }),
  );
  return ((data ?? {}) as Envelope).data as OpsRow;
}

export async function deleteRow(resource: Resource, uuid: string): Promise<void> {
  await call(() => loose().DELETE(`${base(resource)}/{id}`, { params: { path: { id: uuid } } }));
}

export { fromRow };
