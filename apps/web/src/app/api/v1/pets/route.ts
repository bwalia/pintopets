import { PetInput, PetListQuery } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { apiRoute, parseInput, readJson } from "@/server/http";
import { createPet, listPets } from "@/server/pets/service";

export const GET = apiRoute(async (request: Request) => {
  const actor = await requireUser();
  const { status } = parseInput(
    PetListQuery,
    Object.fromEntries(new URL(request.url).searchParams),
  );
  return NextResponse.json(
    { data: await listPets(actor, status) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});

export const POST = apiRoute(async (request: Request) => {
  const actor = await requireUser();
  const input = await readJson(request, PetInput);
  return NextResponse.json({ data: await createPet(actor, input) }, { status: 201 });
});
