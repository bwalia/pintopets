import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiRoute } from "@/server/http";
import { listReminders } from "@/server/pets/reminders";

export const GET = apiRoute(async () => {
  const actor = await requireUser();
  return NextResponse.json(
    { data: await listReminders(actor) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
