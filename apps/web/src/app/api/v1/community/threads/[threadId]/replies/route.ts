import { ReplyInput, ThreadIdParams } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { createReply } from "@/server/community/service";
import { apiRoute, parseInput, readJson } from "@/server/http";

export const POST = apiRoute(
  async (
    request: Request,
    { params }: RouteContext<"/api/v1/community/threads/[threadId]/replies">,
  ) => {
    const actor = await requireUser();
    const { threadId } = parseInput(ThreadIdParams, await params);
    const { body } = await readJson(request, ReplyInput);
    return NextResponse.json({ data: await createReply(actor, threadId, body) }, { status: 201 });
  },
);
