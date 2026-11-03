import { RecordKindSchema, Uuid } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiRoute, HttpError, parseInput } from "@/server/http";
import { createRecord, listRecords } from "@/server/pets/records";

const Params = z.object({ petId: Uuid, kind: RecordKindSchema });
type Ctx = RouteContext<"/api/v1/pets/[petId]/records/[kind]">;

export const GET = apiRoute(async (_request: Request, ctx: Ctx) => {
  const actor = await requireUser();
  const { petId, kind } = parseInput(Params, await ctx.params);
  return NextResponse.json(
    { data: await listRecords(actor, petId, kind) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});

export const POST = apiRoute(async (request: Request, ctx: Ctx) => {
  const actor = await requireUser();
  const { petId, kind } = parseInput(Params, await ctx.params);
  const body: unknown = await request.json().catch(() => {
    throw new HttpError("bad_request", "The request body must be valid JSON.");
  });
  return NextResponse.json({ data: await createRecord(actor, petId, kind, body) }, { status: 201 });
});
