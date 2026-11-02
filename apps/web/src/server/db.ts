import "server-only";
import { createDb, type Database } from "@pintopets/db";
import { env } from "@/env";

type DbHandle = ReturnType<typeof createDb>;

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { __pintopetsDb?: DbHandle };

function handle(): DbHandle {
  globalForDb.__pintopetsDb ??= createDb(env().DATABASE_URL, {
    max: env().NODE_ENV === "production" ? 5 : 10,
  });
  return globalForDb.__pintopetsDb;
}

export function db(): Database {
  return handle().db;
}

/** Cheap connectivity check for the health endpoint. */
export async function pingDatabase(): Promise<boolean> {
  try {
    await handle().client`select 1`;
    return true;
  } catch (error) {
    console.error("Database ping failed:", error instanceof Error ? error.message : error);
    return false;
  }
}
