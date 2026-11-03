import { PetUpdate, Uuid } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiRoute, parseInput, readJson } from "@/server/http";
import { getPet, updatePet } from "@/server/pets/service";

const Params = z.object({ petId: Uuid });
type Ctx = RouteContext<"/api/v1/pets/[petId]">;

export const GET = apiRoute(async (_request: Request, ctx: Ctx) => {
  const actor = await requireUser();
  const { petId } = parseInput(Params, await ctx.params);
  return NextResponse.json(
    { data: await getPet(actor, petId) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});

export const PATCH = apiRoute(async (request: Request, ctx: Ctx) => {
  const actor = await requireUser();
  const { petId } = parseInput(Params, await ctx.params);
  const patch = await readJson(request, PetUpdate);
  return NextResponse.json({ data: await updatePet(actor, petId, patch) });
});
