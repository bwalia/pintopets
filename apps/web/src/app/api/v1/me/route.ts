import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiRoute } from "@/server/http";

export const GET = apiRoute(async () => {
  const me = await requireUser();
  return NextResponse.json({ data: me }, { headers: { "Cache-Control": "private, no-store" } });
});
