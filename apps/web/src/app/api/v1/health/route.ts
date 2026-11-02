import type { HealthResponse } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { pingDatabase } from "@/server/db";
import { apiRoute } from "@/server/http";
import { appEnv, appVersion } from "@/lib/version";

export const GET = apiRoute(async () => {
  const dbOk = await pingDatabase();
  const body: HealthResponse = {
    status: dbOk ? "ok" : "degraded",
    version: appVersion(),
    env: appEnv(),
    time: new Date().toISOString(),
    checks: { database: dbOk ? "ok" : "error" },
  };
  return NextResponse.json(body, {
    status: dbOk ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
});
