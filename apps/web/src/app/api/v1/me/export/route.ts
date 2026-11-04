import { NextResponse } from "next/server";
import { exportMyData } from "@/server/account/export";
import { requireUser } from "@/server/auth";
import { apiRoute } from "@/server/http";
import { requireStepUp } from "@/server/security/step-up";

/** All of the user's data as JSON (UK GDPR). Sensitive: needs a recent authenticator code. */
export const GET = apiRoute(async () => {
  const actor = await requireUser();
  await requireStepUp(actor);
  const data = await exportMyData(actor);
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="pintopets-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
});
