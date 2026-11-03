import "server-only";
import type { Pet, PetInputParsed, PetUpdateParsed } from "@pintopets/api-contract";
import type { Actor } from "../auth";
import { HttpError } from "../http";
import { createRow, deleteRow, getRow, updateRow, userView } from "../opsapi/client";
import { type OpsRow, pgTimestampToIso } from "../opsapi/mapping";
import { speciesBySlug, type SpeciesInfo } from "../reference-data";
import { assertPetAccess, assertWritable, type PetRole, type PetStatus } from "./access";

export function photoUrl(mediaId: string, variant: "thumb" | "full"): string {
  return `/api/v1/photos/${mediaId}/file?variant=${variant}`;
}

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
const int = (v: unknown) => (typeof v === "number" ? v : null);

/** A row of the plugin's `users/:uuid/pets` view → Pet. No further calls. */
function toPet(row: OpsRow): Pet {
  const sp = speciesBySlug(String(row.species));
  if (!sp) throw new Error(`Pet ${row.uuid} has unknown species ${String(row.species)}`);
  const breedSlugs = (str(row.breeds) ?? "").split(",").filter(Boolean);
  const profileId = str(row.profile_photo_uuid);
  const grams = int(row.latest_weight_grams);
  return {
    id: row.uuid,
    name: String(row.name),
    species: {
      slug: sp.slug,
      name: sp.name,
      group: sp.group,
      tracksHeightInHands: sp.tracksHeightInHands,
    },
    speciesOther: str(row.species_other),
    breeds: breedSlugs.flatMap((slug) => {
      const b = sp.breeds.find((x) => x.slug === slug);
      return b ? [{ slug: b.slug, name: b.name }] : [];
    }),
    sex: row.sex as Pet["sex"],
    neutered: row.neutered as Pet["neutered"],
    dateOfBirth: str(row.date_of_birth),
    dateOfBirthIsEstimate: row.date_of_birth_is_estimate === true,
    colourMarkings: str(row.colour_markings),
    heightInches: int(row.height_inches),
    passportNumber: str(row.passport_number),
    insuranceProvider: str(row.insurance_provider),
    insurancePolicyRef: str(row.insurance_policy_ref),
    vetPracticeName: str(row.vet_practice_name),
    vetPracticePhone: str(row.vet_practice_phone),
    emergencyContactName: str(row.emergency_contact_name),
    emergencyContactPhone: str(row.emergency_contact_phone),
    notes: str(row.notes),
    status: row.status as PetStatus,
    deceasedOn: str(row.deceased_on),
    profilePhoto: profileId
      ? {
          id: profileId,
          thumbUrl: photoUrl(profileId, "thumb"),
          altText: str(row.profile_photo_alt),
        }
      : null,
    latestWeight: grams !== null ? { grams, measuredOn: String(row.latest_weight_on) } : null,
    myRole: row.my_role as PetRole,
    createdAt: pgTimestampToIso(String(row.created_at)),
    updatedAt: pgTimestampToIso(String(row.updated_at)),
  };
}

export async function listPets(
  actor: Pick<Actor, "id">,
  status: PetStatus = "active",
): Promise<Pet[]> {
  return (await userView("pets", actor.id, { status })).map(toPet);
}

export async function getPet(actor: Pick<Actor, "id">, petId: string): Promise<Pet> {
  await assertPetAccess(actor, petId);
  const [row] = await userView("pets", actor.id, { pet_uuid: petId });
  if (!row) throw new HttpError("not_found", "We couldn't find that pet.");
  return toPet(row);
}

function resolveSpecies(
  speciesSlug: string,
  breedSlugs: string[],
): SpeciesInfo & { breedSlugs: string[] } {
  const sp = speciesBySlug(speciesSlug);
  if (!sp) {
    throw new HttpError("validation_failed", "Please choose a species.", [
      { path: ["speciesSlug"], message: "Unknown species" },
    ]);
  }
  const unique = [...new Set(breedSlugs)];
  if (!unique.every((slug) => sp.breeds.some((b) => b.slug === slug))) {
    throw new HttpError("validation_failed", "Please choose a breed from the list.", [
      { path: ["breedSlugs"], message: "Unknown breed for this species" },
    ]);
  }
  return { ...sp, breedSlugs: unique };
}

/** PetInput/PetUpdate → plugin columns (camelCase; the store converts to snake_case). */
function profileColumns(input: PetUpdateParsed, sp?: SpeciesInfo & { breedSlugs: string[] }) {
  const { speciesSlug: _s, breedSlugs: _b, ...rest } = input;
  return {
    ...rest,
    ...(sp ? { species: sp.slug, breeds: sp.breedSlugs.join(",") || null } : {}),
    ...(sp && !sp.requiresFreeText ? { speciesOther: null } : {}),
    ...(sp && !sp.tracksHeightInHands ? { heightInches: null } : {}),
  };
}

export async function createPet(actor: Pick<Actor, "id">, input: PetInputParsed): Promise<Pet> {
  const sp = resolveSpecies(input.speciesSlug, input.breedSlugs);
  if (sp.requiresFreeText && !input.speciesOther) {
    throw new HttpError("validation_failed", "Please tell us what kind of animal it is.", [
      { path: ["speciesOther"], message: "Required for Other" },
    ]);
  }
  const pet = await createRow("pets", {
    ...profileColumns(input, sp),
    ownerUserUuid: actor.id,
    status: "active",
  });
  try {
    await createRow("pet-members", { petId: pet.uuid, userUuid: actor.id, role: "owner" });
  } catch (error) {
    await deleteRow("pets", pet.uuid).catch(() => undefined);
    throw error;
  }
  return getPet(actor, pet.uuid);
}

export async function updatePet(
  actor: Pick<Actor, "id">,
  petId: string,
  patch: PetUpdateParsed,
): Promise<Pet> {
  const m = await assertPetAccess(actor, petId, "co_owner");
  assertWritable(m);
  let sp: (SpeciesInfo & { breedSlugs: string[] }) | undefined;
  if (patch.speciesSlug !== undefined || patch.breedSlugs !== undefined) {
    const current = await getRow("pets", petId);
    sp = resolveSpecies(patch.speciesSlug ?? String(current?.species), patch.breedSlugs ?? []);
  }
  const values = profileColumns(patch, sp);
  if (Object.keys(values).length) await updateRow("pets", petId, values);
  return getPet(actor, petId);
}

/** Archive, restore, or mark as passed away. Owner only. */
export async function changePetStatus(
  actor: Pick<Actor, "id">,
  petId: string,
  change: { status: PetStatus; deceasedOn: string | null },
): Promise<Pet> {
  await assertPetAccess(actor, petId, "owner");
  await updateRow("pets", petId, {
    status: change.status,
    deceasedOn: change.status === "deceased" ? change.deceasedOn : null,
  });
  return getPet(actor, petId);
}
