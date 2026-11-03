import "server-only";
import type { Pet, Photo } from "@pintopets/api-contract";
import { env } from "@/env";
import type { Actor } from "../auth";
import { HttpError } from "../http";
import { createRow, deleteRow, getRow, listAll, updateRow } from "../opsapi/client";
import { type OpsRow, pgTimestampToIso } from "../opsapi/mapping";
import { assertPetAccess, assertWritable } from "../pets/access";
import { getPet, photoUrl } from "../pets/service";
import { processImage, UnsupportedImageError } from "./images";
import { storage } from "./storage";

/**
 * Photo metadata lives in OpsAPI (pintopets_photos, visible in the admin
 * dashboard); the image bytes live in PintoPets' storage (a volume now, R2 later).
 */
const s = (v: unknown) => (typeof v === "string" && v ? v : null);
const n = (v: unknown) => (typeof v === "number" ? v : null);

function toPhoto(row: OpsRow, profileId: string | null): Photo {
  return {
    id: row.uuid,
    petId: String(row.pet_uuid),
    caption: s(row.caption),
    altText: s(row.alt_text),
    width: n(row.width),
    height: n(row.height),
    thumbUrl: photoUrl(row.uuid, "thumb"),
    fullUrl: photoUrl(row.uuid, "full"),
    isProfile: row.uuid === profileId,
    createdAt: pgTimestampToIso(String(row.created_at)),
  };
}

async function profileIdOf(petId: string): Promise<string | null> {
  return s((await getRow("pets", petId))?.profile_photo_uuid);
}

export async function listPhotos(actor: Pick<Actor, "id">, petId: string): Promise<Photo[]> {
  await assertPetAccess(actor, petId);
  const [rows, profileId] = await Promise.all([
    listAll("photos", { pet_uuid: petId, sort: "created_at", order: "desc" }),
    profileIdOf(petId),
  ]);
  return rows.map((r) => toPhoto(r, profileId));
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

  const key = `pets/${petId}/${crypto.randomUUID()}`;
  const storageKey = `${key}-full.webp`;
  const thumbKey = `${key}-thumb.webp`;
  await storage().put(storageKey, processed.full, "image/webp");
  await storage().put(thumbKey, processed.thumb, "image/webp");

  try {
    const row = await createRow("photos", {
      petId,
      uploadedByUserUuid: actor.id,
      storageKey,
      thumbKey,
      mimeType: "image/webp",
      bytes: processed.full.byteLength,
      width: processed.width,
      height: processed.height,
      caption: input.caption,
      altText: input.altText,
    });
    // First photo becomes the profile photo.
    let profileId = await profileIdOf(petId);
    if (!profileId) {
      await updateRow("pets", petId, { profilePhotoUuid: row.uuid });
      profileId = row.uuid;
    }
    return toPhoto(row, profileId);
  } catch (error) {
    await storage().delete(storageKey);
    await storage().delete(thumbKey);
    throw error;
  }
}

async function findPhoto(photoId: string): Promise<OpsRow> {
  const row = await getRow("photos", photoId).catch(() => null);
  if (!row) throw new HttpError("not_found", "We couldn't find that photo.");
  return row;
}

export async function updatePhoto(
  actor: Pick<Actor, "id">,
  photoId: string,
  patch: { caption?: string | null; altText?: string | null },
): Promise<Photo> {
  const row = await findPhoto(photoId);
  const petId = String(row.pet_uuid);
  const m = await assertPetAccess(actor, petId, "co_owner");
  assertWritable(m);
  const updated = await updateRow("photos", photoId, patch);
  return toPhoto(updated, await profileIdOf(petId));
}

export async function deletePhoto(actor: Pick<Actor, "id">, photoId: string): Promise<void> {
  const row = await findPhoto(photoId);
  const petId = String(row.pet_uuid);
  const m = await assertPetAccess(actor, petId, "co_owner");
  assertWritable(m);
  if ((await profileIdOf(petId)) === photoId)
    await updateRow("pets", petId, { profilePhotoUuid: null });
  await deleteRow("photos", photoId);
  await storage().delete(String(row.storage_key));
  if (row.thumb_key) await storage().delete(String(row.thumb_key));
}

export async function setProfilePhoto(actor: Pick<Actor, "id">, photoId: string): Promise<Pet> {
  const row = await findPhoto(photoId);
  const petId = String(row.pet_uuid);
  const m = await assertPetAccess(actor, petId, "co_owner");
  assertWritable(m);
  await updateRow("pets", petId, { profilePhotoUuid: photoId });
  return getPet(actor, petId);
}

/** Bytes for a photo the actor may see (private: pet members only). */
export async function readPhotoFile(
  actor: Pick<Actor, "id">,
  photoId: string,
  variant: "thumb" | "full",
): Promise<Buffer> {
  const row = await findPhoto(photoId);
  await assertPetAccess(actor, String(row.pet_uuid));
  const key =
    variant === "thumb" && row.thumb_key ? String(row.thumb_key) : String(row.storage_key);
  const bytes = await storage().get(key);
  if (!bytes) throw new HttpError("not_found", "That photo's file is missing.");
  return bytes;
}
