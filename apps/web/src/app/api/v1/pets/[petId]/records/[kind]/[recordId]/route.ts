import { RecordKindSchema, Uuid } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiRoute, HttpError, parseInput } from "@/server/http";
import { deleteRecord, updateRecord } from "@/server/pets/records";

const Params = z.object({ petId: Uuid, kind: RecordKindSchema, recordId: Uuid });
type Ctx = RouteContext<"/api/v1/pets/[petId]/records/[kind]/[recordId]">;

export const PATCH = apiRoute(async (request: Request, ctx: Ctx) => {
  const actor = await requireUser();
  const { petId, kind, recordId } = parseInput(Params, await ctx.params);
  const body: unknown = await request.json().catch(() => {
    throw new HttpError("bad_request", "The request body must be valid JSON.");
  });
  return NextResponse.json({ data: await updateRecord(actor, petId, kind, recordId, body) });
});

export const DELETE = apiRoute(async (_request: Request, ctx: Ctx) => {
  const actor = await requireUser();
  const { petId, kind, recordId } = parseInput(Params, await ctx.params);
  await deleteRecord(actor, petId, kind, recordId);
  return new NextResponse(null, { status: 204 });
});
