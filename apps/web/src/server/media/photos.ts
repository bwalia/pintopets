import "server-only";
import type { Pet, Photo } from "@pintopets/api-contract";
import { schema, uuidv7 } from "@pintopets/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { env } from "@/env";
import type { Actor } from "../auth";
import { db } from "../db";
import { HttpError } from "../http";
import { assertPetAccess, assertWritable } from "../pets/access";
import { getPet, photoUrl } from "../pets/service";
import { processImage, UnsupportedImageError } from "./images";
import { storage } from "./storage";

const { media, pets } = schema;

type MediaRow = typeof media.$inferSelect;
type PetPhotoRow = MediaRow & { petId: string };

function toPhoto(row: PetPhotoRow, profileMediaId: string | null): Photo {
  return {
    id: row.id,
    petId: row.petId,
    caption: row.caption,
    altText: row.altText,
    width: row.width,
    height: row.height,
    thumbUrl: photoUrl(row.id, "thumb"),
    fullUrl: photoUrl(row.id, "full"),
    isProfile: row.id === profileMediaId,
    createdAt: row.createdAt.toISOString(),
  };
}

async function profileIdOf(petId: string): Promise<string | null> {
  const [p] = await db().select({ id: pets.profileMediaId }).from(pets).where(eq(pets.id, petId));
  return p?.id ?? null;
}

export async function listPhotos(actor: Pick<Actor, "id">, petId: string): Promise<Photo[]> {
  await assertPetAccess(actor, petId);
  const [rows, profileId] = await Promise.all([
    db()
      .select()
      .from(media)
      .where(and(eq(media.petId, petId), eq(media.kind, "image"), isNull(media.deletedAt)))
      .orderBy(desc(media.createdAt)),
    profileIdOf(petId),
  ]);
  return rows.flatMap((r) => (r.petId ? [toPhoto({ ...r, petId: r.petId }, profileId)] : []));
}

export interface UploadInput {
  bytes: Buffer;
  caption: string | null;
  altText: string | null;
}

export async function uploadPhoto(
  actor: Pick<Actor, "id">,
  petId: string,
  input: UploadInput,
): Promise<Photo> {
  const m = await assertPetAccess(actor, petId, "co_owner");
  assertWritable(m);
  if (input.bytes.byteLength > env().MAX_UPLOAD_BYTES) {
    throw new HttpError(
      "payload_too_large",
      `Photos can be up to ${Math.round(env().MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`,
    );
  }

  let processed;
  try {
    processed = await processImage(input.bytes);
  } catch (error) {
    if (error instanceof UnsupportedImageError)
      throw new HttpError("unsupported_media_type", error.message);
    throw error;
  }

  const id = uuidv7();
  const storageKey = `pets/${petId}/${id}-full.webp`;
  const thumbKey = `pets/${petId}/${id}-thumb.webp`;
  await storage().put(storageKey, processed.full, "image/webp");
  await storage().put(thumbKey, processed.thumb, "image/webp");

  try {
    const [row] = await db()
      .insert(media)
      .values({
        id,
        petId,
        uploadedBy: actor.id,
        kind: "image",
        status: "ready",
        storageKey,
        thumbKey,
        mimeType: "image/webp",
        bytes: processed.full.byteLength,
        width: processed.width,
        height: processed.height,
        caption: input.caption,
        altText: input.altText,
      })
      .returning();
    // First photo becomes the profile photo.
    await db()
      .update(pets)
      .set({ profileMediaId: id })
      .where(and(eq(pets.id, petId), isNull(pets.profileMediaId)));
    if (!row) throw new Error("Insert failed");
    return toPhoto({ ...row, petId }, await profileIdOf(petId));
  } catch (error) {
    await storage().delete(storageKey);
    await storage().delete(thumbKey);
    throw error;
  }
}

async function findPhoto(photoId: string): Promise<PetPhotoRow> {
  const [row] = await db()
    .select()
    .from(media)
    .where(and(eq(media.id, photoId), eq(media.kind, "image"), isNull(media.deletedAt)))
    .limit(1);
  if (!row?.petId) throw new HttpError("not_found", "We couldn't find that photo.");
  return { ...row, petId: row.petId };
}

export async function updatePhoto(
  actor: Pick<Actor, "id">,
  photoId: string,
  patch: { caption?: string | null; altText?: string | null },
): Promise<Photo> {
  const row = await findPhoto(photoId);
  const m = await assertPetAccess(actor, row.petId, "co_owner");
  assertWritable(m);
  const [updated] = await db().update(media).set(patch).where(eq(media.id, photoId)).returning();
  if (!updated) throw new HttpError("not_found", "We couldn't find that photo.");
  return toPhoto({ ...updated, petId: row.petId }, await profileIdOf(row.petId));
}

export async function deletePhoto(actor: Pick<Actor, "id">, photoId: string): Promise<void> {
  const row = await findPhoto(photoId);
  const m = await assertPetAccess(actor, row.petId, "co_owner");
  assertWritable(m);
  await db().update(media).set({ deletedAt: new Date() }).where(eq(media.id, photoId));
  await db().update(pets).set({ profileMediaId: null }).where(eq(pets.profileMediaId, photoId));
  await storage().delete(row.storageKey);
  if (row.thumbKey) await storage().delete(row.thumbKey);
}

export async function setProfilePhoto(actor: Pick<Actor, "id">, photoId: string): Promise<Pet> {
  const row = await findPhoto(photoId);
  const m = await assertPetAccess(actor, row.petId, "co_owner");
  assertWritable(m);
  await db().update(pets).set({ profileMediaId: photoId }).where(eq(pets.id, row.petId));
  return getPet(actor, row.petId);
}

/** Bytes for a photo the actor may see (private: pet members only). */
export async function readPhotoFile(
  actor: Pick<Actor, "id">,
  photoId: string,
  variant: "thumb" | "full",
): Promise<Buffer> {
  const row = await findPhoto(photoId);
  await assertPetAccess(actor, row.petId);
  const key = variant === "thumb" && row.thumbKey ? row.thumbKey : row.storageKey;
  const bytes = await storage().get(key);
  if (!bytes) throw new HttpError("not_found", "That photo's file is missing.");
  return bytes;
}
