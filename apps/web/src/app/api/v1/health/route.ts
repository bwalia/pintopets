import type { HealthResponse } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { pingOpsApi } from "@/server/opsapi/health";
import { apiRoute } from "@/server/http";
import { appEnv, appVersion } from "@/lib/version";

export const GET = apiRoute(async () => {
  const ok = await pingOpsApi();
  const body: HealthResponse = {
    status: ok ? "ok" : "degraded",
    version: appVersion(),
    env: appEnv(),
    time: new Date().toISOString(),
    checks: { opsapi: ok ? "ok" : "error" },
  };
  return NextResponse.json(body, {
    status: ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
});
