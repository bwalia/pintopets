import { Uuid } from "@pintopets/api-contract";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiRoute, parseInput } from "@/server/http";
import { readPhotoFile } from "@/server/media/photos";

const Params = z.object({ id: Uuid });
const Query = z.object({ variant: z.enum(["thumb", "full"]).default("full") });

/** Private photo bytes: members of the pet only, never cached by shared caches. */
export const GET = apiRoute(
  async (request: Request, ctx: RouteContext<"/api/v1/photos/[id]/file">) => {
    const actor = await requireUser();
    const { id } = parseInput(Params, await ctx.params);
    const { variant } = parseInput(Query, Object.fromEntries(new URL(request.url).searchParams));
    const bytes = await readPhotoFile(actor, id, variant);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(bytes.byteLength),
        // Photos never change once uploaded (edits create new media), so the
        // browser may keep them, but only privately.
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  },
);
