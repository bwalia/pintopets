import { PhotoUpdate, Uuid } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiRoute, parseInput, readJson } from "@/server/http";
import { deletePhoto, updatePhoto } from "@/server/media/photos";

const Params = z.object({ id: Uuid });
type Ctx = RouteContext<"/api/v1/photos/[id]">;

export const PATCH = apiRoute(async (request: Request, ctx: Ctx) => {
  const actor = await requireUser();
  const { id } = parseInput(Params, await ctx.params);
  const patch = await readJson(request, PhotoUpdate);
  return NextResponse.json({ data: await updatePhoto(actor, id, patch) });
});

export const DELETE = apiRoute(async (_request: Request, ctx: Ctx) => {
  const actor = await requireUser();
  const { id } = parseInput(Params, await ctx.params);
  await deletePhoto(actor, id);
  return new NextResponse(null, { status: 204 });
});
