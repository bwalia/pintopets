"use server";

import {
  PetInput,
  PetStatusChange,
  PetUpdate,
  PhotoUpdate,
  RecordKindSchema,
  Uuid,
} from "@pintopets/api-contract";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { type ActionResult, runAction } from "@/server/actions";
import { deletePhoto, setProfilePhoto, updatePhoto } from "@/server/media/photos";
import { createRecord, deleteRecord, updateRecord } from "@/server/pets/records";
import { changePetStatus, createPet, deletePet, updatePet } from "@/server/pets/service";
import { requireStepUp } from "@/server/security/step-up";

/**
 * Server actions for the My Pets UI. They are public endpoints like the API,
 * so every argument is validated, and they call the same services (and
 * therefore the same permission checks) as /api/v1. Next.js checks the Origin
 * of every action request.
 */
function refreshPet(petId: string) {
  revalidatePath(`/pets/${petId}`, "layout");
  revalidatePath("/pets");
  revalidatePath("/reminders");
  revalidatePath("/");
}

export async function createPetAction(payload: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await requireUser();
    const pet = await createPet(actor, PetInput.parse(payload));
    revalidatePath("/pets");
    revalidatePath("/");
    return { id: pet.id };
  });
}

export async function updatePetAction(petId: unknown, payload: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireUser();
    const id = Uuid.parse(petId);
    await updatePet(actor, id, PetUpdate.parse(payload));
    refreshPet(id);
    return undefined;
  });
}

export async function changeStatusAction(petId: unknown, payload: unknown): Promise<ActionResult> {
  return runAction(async () => {
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
  return runAction(async () => {
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
  return runAction(async () => {
    const actor = await requireUser();
    const id = Uuid.parse(petId);
    await deleteRecord(actor, id, RecordKindSchema.parse(kind), Uuid.parse(recordId));
    refreshPet(id);
    return undefined;
  });
}

export async function setProfilePhotoAction(photoId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireUser();
    const pet = await setProfilePhoto(actor, Uuid.parse(photoId));
    refreshPet(pet.id);
    return undefined;
  });
}

export async function updatePhotoAction(photoId: unknown, payload: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireUser();
    const photo = await updatePhoto(actor, Uuid.parse(photoId), PhotoUpdate.parse(payload));
    refreshPet(photo.petId);
    return undefined;
  });
}

export async function deletePhotoAction(petId: unknown, photoId: unknown): Promise<ActionResult> {
  return runAction(async () => {
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

/** Permanent delete: owner only, and a recent authenticator code (step-up). */
export async function deletePetAction(petId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireUser();
    const id = Uuid.parse(petId);
    await requireStepUp(actor);
    await deletePet(actor, id);
    revalidatePath("/pets");
    revalidatePath("/");
    revalidatePath("/reminders");
    return undefined;
  });
}
