import { Uuid } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiRoute, parseInput } from "@/server/http";
import { setProfilePhoto } from "@/server/media/photos";

const Params = z.object({ id: Uuid });

export const POST = apiRoute(
  async (_request: Request, ctx: RouteContext<"/api/v1/photos/[id]/profile">) => {
    const actor = await requireUser();
    const { id } = parseInput(Params, await ctx.params);
    return NextResponse.json({ data: await setProfilePhoto(actor, id) });
  },
);
