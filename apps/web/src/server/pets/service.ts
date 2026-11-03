import "server-only";
import type { Pet, PetInputParsed, PetUpdateParsed } from "@pintopets/api-contract";
import { schema } from "@pintopets/db";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Actor } from "../auth";
import { db } from "../db";
import { HttpError } from "../http";
import { assertPetAccess, assertWritable, type PetRole, type PetStatus } from "./access";

const { pets, petMembers, petBreeds, breeds, species, media, weightEntries } = schema;

type PetRow = typeof pets.$inferSelect;

export function photoUrl(mediaId: string, variant: "thumb" | "full"): string {
  return `/api/v1/photos/${mediaId}/file?variant=${variant}`;
}

/** Builds API DTOs for pets in a few batched queries. */
async function hydrate(rows: { pet: PetRow; role: PetRole }[]): Promise<Pet[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.pet.id);
  const speciesIds = [...new Set(rows.map((r) => r.pet.speciesId))];
  const profileIds = rows.map((r) => r.pet.profileMediaId).filter((x): x is string => Boolean(x));

  const [speciesRows, breedRows, photoRows, weightRows] = await Promise.all([
    db().select().from(species).where(inArray(species.id, speciesIds)),
    db()
      .select({
        petId: petBreeds.petId,
        slug: breeds.slug,
        name: breeds.name,
        position: petBreeds.position,
      })
      .from(petBreeds)
      .innerJoin(breeds, eq(breeds.id, petBreeds.breedId))
      .where(inArray(petBreeds.petId, ids))
      .orderBy(asc(petBreeds.position)),
    profileIds.length
      ? db()
          .select({ id: media.id, altText: media.altText })
          .from(media)
          .where(and(inArray(media.id, profileIds), isNull(media.deletedAt)))
      : Promise.resolve([]),
    db()
      .selectDistinctOn([weightEntries.petId], {
        petId: weightEntries.petId,
        grams: weightEntries.weightGrams,
        measuredOn: weightEntries.measuredOn,
      })
      .from(weightEntries)
      .where(inArray(weightEntries.petId, ids))
      .orderBy(weightEntries.petId, desc(weightEntries.measuredOn), desc(weightEntries.createdAt)),
  ]);

  const speciesById = new Map(speciesRows.map((s) => [s.id, s]));
  const photoById = new Map(photoRows.map((p) => [p.id, p]));
  const weightByPet = new Map(weightRows.map((w) => [w.petId, w]));

  return rows.map(({ pet, role }) => {
    const sp = speciesById.get(pet.speciesId);
    if (!sp) throw new Error(`Species ${pet.speciesId} missing`);
    const photo = pet.profileMediaId ? photoById.get(pet.profileMediaId) : undefined;
    const weight = weightByPet.get(pet.id);
    return {
      id: pet.id,
      name: pet.name,
      species: {
        slug: sp.slug,
        name: sp.name,
        group: sp.group,
        tracksHeightInHands: sp.tracksHeightInHands,
      },
      speciesOther: pet.speciesOther,
      breeds: breedRows.filter((b) => b.petId === pet.id).map(({ slug, name }) => ({ slug, name })),
      sex: pet.sex,
      neutered: pet.neutered,
      dateOfBirth: pet.dateOfBirth,
      dateOfBirthIsEstimate: pet.dateOfBirthIsEstimate,
      colourMarkings: pet.colourMarkings,
      heightInches: pet.heightInches,
      passportNumber: pet.passportNumber,
      insuranceProvider: pet.insuranceProvider,
      insurancePolicyRef: pet.insurancePolicyRef,
      vetPracticeName: pet.vetPracticeName,
      vetPracticePhone: pet.vetPracticePhone,
      emergencyContactName: pet.emergencyContactName,
      emergencyContactPhone: pet.emergencyContactPhone,
      notes: pet.notes,
      status: pet.status,
      deceasedOn: pet.deceasedOn,
      profilePhoto: photo
        ? { id: photo.id, thumbUrl: photoUrl(photo.id, "thumb"), altText: photo.altText }
        : null,
      latestWeight: weight ? { grams: weight.grams, measuredOn: weight.measuredOn } : null,
      myRole: role,
      createdAt: pet.createdAt.toISOString(),
      updatedAt: pet.updatedAt.toISOString(),
    };
  });
}

export async function listPets(
  actor: Pick<Actor, "id">,
  status: PetStatus = "active",
): Promise<Pet[]> {
  const rows = await db()
    .select({ pet: pets, role: petMembers.role })
    .from(petMembers)
    .innerJoin(pets, eq(pets.id, petMembers.petId))
    .where(and(eq(petMembers.userId, actor.id), eq(pets.status, status), isNull(pets.deletedAt)))
    .orderBy(asc(sql`lower(${pets.name})`));
  return hydrate(rows);
}

export async function getPet(actor: Pick<Actor, "id">, petId: string): Promise<Pet> {
  const m = await assertPetAccess(actor, petId);
  const [pet] = await db().select().from(pets).where(eq(pets.id, petId)).limit(1);
  if (!pet) throw new HttpError("not_found", "We couldn't find that pet.");
  const [dto] = await hydrate([{ pet, role: m.role }]);
  if (!dto) throw new HttpError("not_found", "We couldn't find that pet.");
  return dto;
}

interface ResolvedSpecies {
  speciesId: string;
  breedIds: string[];
  tracksHeightInHands: boolean;
  requiresFreeText: boolean;
}

async function resolveSpecies(speciesSlug: string, breedSlugs: string[]): Promise<ResolvedSpecies> {
  const [sp] = await db().select().from(species).where(eq(species.slug, speciesSlug)).limit(1);
  if (!sp) {
    throw new HttpError("validation_failed", "Please choose a species.", [
      { path: ["speciesSlug"], message: "Unknown species" },
    ]);
  }
  const unique = [...new Set(breedSlugs)];
  const found = unique.length
    ? await db()
        .select({ id: breeds.id, slug: breeds.slug })
        .from(breeds)
        .where(and(eq(breeds.speciesId, sp.id), inArray(breeds.slug, unique)))
    : [];
  if (found.length !== unique.length) {
    throw new HttpError("validation_failed", "Please choose a breed from the list.", [
      { path: ["breedSlugs"], message: "Unknown breed for this species" },
    ]);
  }
  const idBySlug = new Map(found.map((b) => [b.slug, b.id]));
  return {
    speciesId: sp.id,
    breedIds: unique.flatMap((s) => idBySlug.get(s) ?? []),
    tracksHeightInHands: sp.tracksHeightInHands,
    requiresFreeText: sp.requiresFreeText,
  };
}

function profileColumns(input: PetUpdateParsed, sp?: ResolvedSpecies) {
  const { speciesSlug: _s, breedSlugs: _b, ...rest } = input;
  return {
    ...rest,
    ...(sp ? { speciesId: sp.speciesId } : {}),
    ...(sp && !sp.requiresFreeText ? { speciesOther: null } : {}),
    ...(sp && !sp.tracksHeightInHands ? { heightInches: null } : {}),
  };
}

export async function createPet(actor: Pick<Actor, "id">, input: PetInputParsed): Promise<Pet> {
  const sp = await resolveSpecies(input.speciesSlug, input.breedSlugs);
  if (sp.requiresFreeText && !input.speciesOther) {
    throw new HttpError("validation_failed", "Please tell us what kind of animal it is.", [
      { path: ["speciesOther"], message: "Required for Other" },
    ]);
  }
  const petId = await db().transaction(async (tx) => {
    const [pet] = await tx
      .insert(pets)
      .values({
        ...profileColumns(input, sp),
        name: input.name,
        speciesId: sp.speciesId,
        createdBy: actor.id,
      })
      .returning({ id: pets.id });
    if (!pet) throw new Error("Insert failed");
    await tx.insert(petMembers).values({ petId: pet.id, userId: actor.id, role: "owner" });
    if (sp.breedIds.length) {
      await tx
        .insert(petBreeds)
        .values(sp.breedIds.map((breedId, position) => ({ petId: pet.id, breedId, position })));
    }
    return pet.id;
  });
  return getPet(actor, petId);
}

export async function updatePet(
  actor: Pick<Actor, "id">,
  petId: string,
  patch: PetUpdateParsed,
): Promise<Pet> {
  const m = await assertPetAccess(actor, petId, "co_owner");
  assertWritable(m);
  const [current] = await db().select().from(pets).where(eq(pets.id, petId)).limit(1);
  if (!current) throw new HttpError("not_found", "We couldn't find that pet.");

  let sp: ResolvedSpecies | undefined;
  if (patch.speciesSlug !== undefined || patch.breedSlugs !== undefined) {
    const [currentSpecies] = await db()
      .select()
      .from(species)
      .where(eq(species.id, current.speciesId));
    if (!currentSpecies) throw new Error(`Species ${current.speciesId} missing`);
    sp = await resolveSpecies(patch.speciesSlug ?? currentSpecies.slug, patch.breedSlugs ?? []);
  }

  await db().transaction(async (tx) => {
    const values = profileColumns(patch, sp);
    if (Object.keys(values).length) await tx.update(pets).set(values).where(eq(pets.id, petId));
    if (sp) {
      await tx.delete(petBreeds).where(eq(petBreeds.petId, petId));
      if (sp.breedIds.length) {
        await tx
          .insert(petBreeds)
          .values(sp.breedIds.map((breedId, position) => ({ petId, breedId, position })));
      }
    }
  });
  return getPet(actor, petId);
}

/** Archive, restore, or mark as passed away. Owner only. */
export async function changePetStatus(
  actor: Pick<Actor, "id">,
  petId: string,
  change: { status: PetStatus; deceasedOn: string | null },
): Promise<Pet> {
  await assertPetAccess(actor, petId, "owner");
  await db()
    .update(pets)
    .set({
      status: change.status,
      deceasedOn: change.status === "deceased" ? change.deceasedOn : null,
    })
    .where(eq(pets.id, petId));
  return getPet(actor, petId);
}
