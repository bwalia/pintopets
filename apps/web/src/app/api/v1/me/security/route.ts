import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiRoute } from "@/server/http";
import { securityStatus } from "@/server/security/service";

export const GET = apiRoute(async () => {
  const actor = await requireUser();
  return NextResponse.json(
    { data: await securityStatus(actor) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
