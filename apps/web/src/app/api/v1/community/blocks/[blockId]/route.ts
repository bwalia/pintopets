import { BlockIdParams } from "@pintopets/api-contract";
import { requireUser } from "@/server/auth";
import { unblock } from "@/server/community/service";
import { apiRoute, parseInput } from "@/server/http";

export const DELETE = apiRoute(
  async (_request: Request, { params }: RouteContext<"/api/v1/community/blocks/[blockId]">) => {
    const actor = await requireUser();
    const { blockId } = parseInput(BlockIdParams, await params);
    await unblock(actor, blockId);
    return new Response(null, { status: 204 });
  },
);
