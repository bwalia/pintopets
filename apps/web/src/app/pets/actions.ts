"use server";

import {
  PetInput,
  PetStatusChange,
  PetUpdate,
  PhotoUpdate,
  RecordKindSchema,
  toValidationIssues,
  Uuid,
} from "@pintopets/api-contract";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { HttpError } from "@/server/http";
import { deletePhoto, setProfilePhoto, updatePhoto } from "@/server/media/photos";
import { createRecord, deleteRecord, updateRecord } from "@/server/pets/records";
import { changePetStatus, createPet, updatePet } from "@/server/pets/service";

/**
 * Server actions for the My Pets UI. They are public endpoints like the API,
 * so every argument is validated, and they call the same services (and
 * therefore the same permission checks) as /api/v1. Next.js checks the Origin
 * of every action request.
 */
export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; message: string; fieldErrors: Record<string, string> };

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        message: "Please check the highlighted fields.",
        fieldErrors: issuesToFields(toValidationIssues(error)),
      };
    }
    if (error instanceof HttpError) {
      const issues = Array.isArray(error.details)
        ? (error.details as { path: (string | number)[]; message: string }[])
        : [];
      return { ok: false, message: error.message, fieldErrors: issuesToFields(issues) };
    }
    console.error(error);
    return {
      ok: false,
      message: "Something went wrong on our side. Please try again.",
      fieldErrors: {},
    };
  }
}

function issuesToFields(
  issues: { path: (string | number)[]; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "");
    if (key && !out[key]) out[key] = i.message;
  }
  return out;
}

function refreshPet(petId: string) {
  revalidatePath(`/pets/${petId}`, "layout");
  revalidatePath("/pets");
  revalidatePath("/reminders");
  revalidatePath("/");
}

export async function createPetAction(payload: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const actor = await requireUser();
    const pet = await createPet(actor, PetInput.parse(payload));
    revalidatePath("/pets");
    revalidatePath("/");
    return { id: pet.id };
  });
}

export async function updatePetAction(petId: unknown, payload: unknown): Promise<ActionResult> {
  return run(async () => {
    const actor = await requireUser();
    const id = Uuid.parse(petId);
    await updatePet(actor, id, PetUpdate.parse(payload));
    refreshPet(id);
    return undefined;
  });
}

export async function changeStatusAction(petId: unknown, payload: unknown): Promise<ActionResult> {
  return run(async () => {
    const actor = await requireUser();
    const id = Uuid.parse(petId);
    await changePetStatus(actor, id, PetStatusChange.parse(payload));
    refreshPet(id);
    return undefined;
  });
}

export async function saveRecordAction(
  petId: unknown,
  kind: unknown,
  recordId: unknown,
  payload: unknown,
): Promise<ActionResult> {
  return run(async () => {
    const actor = await requireUser();
    const id = Uuid.parse(petId);
    const k = RecordKindSchema.parse(kind);
    if (recordId) await updateRecord(actor, id, k, Uuid.parse(recordId), payload);
    else await createRecord(actor, id, k, payload);
    refreshPet(id);
    return undefined;
  });
}

export async function deleteRecordAction(
  petId: unknown,
  kind: unknown,
  recordId: unknown,
): Promise<ActionResult> {
  return run(async () => {
    const actor = await requireUser();
    const id = Uuid.parse(petId);
    await deleteRecord(actor, id, RecordKindSchema.parse(kind), Uuid.parse(recordId));
    refreshPet(id);
    return undefined;
  });
}

export async function setProfilePhotoAction(photoId: unknown): Promise<ActionResult> {
  return run(async () => {
    const actor = await requireUser();
    const pet = await setProfilePhoto(actor, Uuid.parse(photoId));
    refreshPet(pet.id);
    return undefined;
  });
}

export async function updatePhotoAction(photoId: unknown, payload: unknown): Promise<ActionResult> {
  return run(async () => {
    const actor = await requireUser();
    const photo = await updatePhoto(actor, Uuid.parse(photoId), PhotoUpdate.parse(payload));
    refreshPet(photo.petId);
    return undefined;
  });
}

export async function deletePhotoAction(petId: unknown, photoId: unknown): Promise<ActionResult> {
  return run(async () => {
    const actor = await requireUser();
    await deletePhoto(actor, Uuid.parse(photoId));
    refreshPet(Uuid.parse(petId));
    return undefined;
  });
}

/** After a photo upload through the API, refresh the cached pages. */
export async function photosChangedAction(petId: unknown): Promise<void> {
  await requireUser();
  refreshPet(Uuid.parse(petId));
}
