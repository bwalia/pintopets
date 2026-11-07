import { ReportInput } from "@pintopets/api-contract";
import { requireUser } from "@/server/auth";
import { report } from "@/server/community/service";
import { apiRoute, readJson } from "@/server/http";

export const POST = apiRoute(async (request: Request) => {
  const actor = await requireUser();
  await report(actor, await readJson(request, ReportInput));
  return new Response(null, { status: 204 });
});
