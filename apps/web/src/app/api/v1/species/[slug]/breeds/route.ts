import { type BreedListResponse, SpeciesSlugParams } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { apiRoute, HttpError, parseInput } from "@/server/http";
import { listBreeds } from "@/server/reference";

export const GET = apiRoute(
  async (_request: Request, context: RouteContext<"/api/v1/species/[slug]/breeds">) => {
    const { slug } = parseInput(SpeciesSlugParams, await context.params);
    const data = await listBreeds(slug);
    if (!data) throw new HttpError("not_found", "We don't know that species.");
    const body: BreedListResponse = { data };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
    });
  },
);
