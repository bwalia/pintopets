import { optionalText, Uuid } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiRoute, HttpError, parseInput } from "@/server/http";
import { listPhotos, uploadPhoto } from "@/server/media/photos";

const Params = z.object({ petId: Uuid });
const Fields = z.object({ caption: optionalText(300), altText: optionalText(300) });
type Ctx = RouteContext<"/api/v1/pets/[petId]/photos">;

export const GET = apiRoute(async (_request: Request, ctx: Ctx) => {
  const actor = await requireUser();
  const { petId } = parseInput(Params, await ctx.params);
  return NextResponse.json(
    { data: await listPhotos(actor, petId) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});

export const POST = apiRoute(async (request: Request, ctx: Ctx) => {
  const actor = await requireUser();
  const { petId } = parseInput(Params, await ctx.params);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new HttpError("bad_request", "Send the photo as multipart/form-data.");
  }
  const file = form.get("file");
  if (!(file instanceof File))
    throw new HttpError("bad_request", "Please choose a photo to upload.");
  const fields = parseInput(Fields, { caption: form.get("caption"), altText: form.get("altText") });
  const photo = await uploadPhoto(actor, petId, {
    bytes: Buffer.from(await file.arrayBuffer()),
    caption: fields.caption,
    altText: fields.altText,
  });
  return NextResponse.json({ data: photo }, { status: 201 });
});
