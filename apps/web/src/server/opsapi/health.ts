import "server-only";
import { env } from "@/env";

/** Cheap reachability check of OpsAPI for /api/v1/health. */
export async function pingOpsApi(): Promise<boolean> {
  try {
    const res = await fetch(new URL("/health", env().OPSAPI_URL), {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    return res.ok;
  } catch (error) {
    console.error("OpsAPI ping failed:", error instanceof Error ? error.message : error);
    return false;
  }
}
