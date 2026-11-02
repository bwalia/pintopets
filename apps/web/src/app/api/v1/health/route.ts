import type { HealthResponse } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { pingDatabase } from "@/server/db";
import { apiRoute } from "@/server/http";
import { APP_VERSION } from "@/lib/version";

export const GET = apiRoute(async () => {
  const dbOk = await pingDatabase();
  const body: HealthResponse = {
    status: dbOk ? "ok" : "degraded",
    version: APP_VERSION,
    time: new Date().toISOString(),
    checks: { database: dbOk ? "ok" : "error" },
  };
  return NextResponse.json(body, {
    status: dbOk ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
});
