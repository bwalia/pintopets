import { PetStatusChange, Uuid } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiRoute, parseInput, readJson } from "@/server/http";
import { changePetStatus } from "@/server/pets/service";

const Params = z.object({ petId: Uuid });

export const POST = apiRoute(
  async (request: Request, ctx: RouteContext<"/api/v1/pets/[petId]/status">) => {
    const actor = await requireUser();
    const { petId } = parseInput(Params, await ctx.params);
    const change = await readJson(request, PetStatusChange);
    return NextResponse.json({ data: await changePetStatus(actor, petId, change) });
  },
);
