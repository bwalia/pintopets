import { ThreadIdParams } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth";
import { getThread } from "@/server/community/service";
import { apiRoute, parseInput } from "@/server/http";

export const GET = apiRoute(
  async (_request: Request, { params }: RouteContext<"/api/v1/community/threads/[threadId]">) => {
    const { threadId } = parseInput(ThreadIdParams, await params);
    return NextResponse.json(
      { data: await getThread(await currentUser(), threadId) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  },
);
