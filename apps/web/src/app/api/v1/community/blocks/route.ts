import { BlockInput } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { block, listBlocks } from "@/server/community/service";
import { apiRoute, readJson } from "@/server/http";

export const GET = apiRoute(async () => {
  const actor = await requireUser();
  return NextResponse.json(
    { data: await listBlocks(actor) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});

export const POST = apiRoute(async (request: Request) => {
  const actor = await requireUser();
  const blocked = await block(actor, await readJson(request, BlockInput));
  return NextResponse.json({ data: blocked }, { status: 201 });
});
