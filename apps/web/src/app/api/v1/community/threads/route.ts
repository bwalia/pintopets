import { ThreadInput, ThreadListQuery } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { currentUser, requireUser } from "@/server/auth";
import { createThread, listThreads } from "@/server/community/service";
import { apiRoute, parseInput, readJson } from "@/server/http";

export const GET = apiRoute(async (request: Request) => {
  const query = parseInput(ThreadListQuery, Object.fromEntries(new URL(request.url).searchParams));
  const viewer = await currentUser();
  return NextResponse.json(await listThreads(viewer, query), {
    headers: { "Cache-Control": "private, no-store" },
  });
});

export const POST = apiRoute(async (request: Request) => {
  const actor = await requireUser();
  const input = await readJson(request, ThreadInput);
  return NextResponse.json({ data: await createThread(actor, input) }, { status: 201 });
});
