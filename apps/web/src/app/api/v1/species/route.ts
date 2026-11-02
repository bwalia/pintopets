import type { SpeciesListResponse } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { apiRoute } from "@/server/http";
import { listSpecies } from "@/server/reference";

export const GET = apiRoute(async () => {
  const body: SpeciesListResponse = { data: await listSpecies() };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
});
