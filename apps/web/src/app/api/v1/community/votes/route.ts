import { VoteInput } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { vote } from "@/server/community/service";
import { apiRoute, readJson } from "@/server/http";

export const POST = apiRoute(async (request: Request) => {
  const actor = await requireUser();
  return NextResponse.json({ data: await vote(actor, await readJson(request, VoteInput)) });
});
