import { schema, uuidv7 } from "@pintopets/db";
import { PetInput } from "@pintopets/api-contract";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../db";
import { HttpError } from "../http";
import { createRecord, deleteRecord, listRecords, updateRecord } from "./records";
import { listReminders, todayInLondon } from "./reminders";
import { changePetStatus, createPet, getPet, listPets, updatePet } from "./service";

/**
 * Permission and behaviour tests against a real, migrated and seeded
 * database (section 10: "a user cannot see or change another user's pet").
 */
const hasDb = Boolean(process.env.DATABASE_URL);

async function makeUser(label: string) {
  const email = `${label}-${uuidv7()}@test.pintopets.app`;
  const [u] = await db()
    .insert(schema.users)
    .values({ email, name: label, displayName: label })
    .returning({ id: schema.users.id });
  if (!u) throw new Error("user insert failed");
  return { id: u.id };
}

const dog = (over: Partial<PetInput> = {}) =>
  PetInput.parse({ name: "Max", speciesSlug: "dog", breedSlugs: ["labrador-retriever"], ...over });

async function expectHttp(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy(
    (e: unknown) => e instanceof HttpError && e.code === code,
  );
}

describe.skipIf(!hasDb)("pets (integration)", () => {
  let alice: { id: string };
  let bob: { id: string };

  beforeAll(async () => {
    alice = await makeUser("alice");
    bob = await makeUser("bob");
  });

  it("creates a pet with the creator as owner, species and breed", async () => {
    const pet = await createPet(alice, dog());
    expect(pet).toMatchObject({
      name: "Max",
      myRole: "owner",
      status: "active",
      species: { slug: "dog" },
      breeds: [{ slug: "labrador-retriever", name: "Labrador Retriever" }],
    });
    expect((await listPets(alice)).map((p) => p.id)).toContain(pet.id);
  });

  it("never shows or changes another user's pet (404, not 403)", async () => {
    const pet = await createPet(alice, dog({ name: "Private" }));
    expect((await listPets(bob)).map((p) => p.id)).not.toContain(pet.id);
    await expectHttp(getPet(bob, pet.id), "not_found");
    await expectHttp(updatePet(bob, pet.id, { name: "Stolen" }), "not_found");
    await expectHttp(listRecords(bob, pet.id, "vaccinations"), "not_found");
    await expectHttp(
      createRecord(bob, pet.id, "weights", { measuredOn: "2026-11-01", weightGrams: 1000 }),
      "not_found",
    );
    await expectHttp(
      changePetStatus(bob, pet.id, { status: "archived", deceasedOn: null }),
      "not_found",
    );
  });

  it("carers can view and log symptoms but not edit the profile or archive", async () => {
    const pet = await createPet(alice, dog({ name: "Sitting" }));
    await db().insert(schema.petMembers).values({ petId: pet.id, userId: bob.id, role: "carer" });

    expect((await getPet(bob, pet.id)).myRole).toBe("carer");
    const entry = await createRecord(bob, pet.id, "symptoms", {
      occurredAt: "2026-11-02T08:30:00Z",
      symptom: "Sick after breakfast",
      severity: "mild",
    });
    expect(entry.occurredAt).toBe("2026-11-02T08:30:00.000Z");
    await expectHttp(updatePet(bob, pet.id, { name: "Renamed" }), "forbidden");
    await expectHttp(
      createRecord(bob, pet.id, "medications", {
        name: "X",
        doseAsPrescribed: "as vet wrote",
        frequency: "daily",
        startOn: "2026-11-01",
      }),
      "forbidden",
    );
    await expectHttp(
      changePetStatus(bob, pet.id, { status: "archived", deceasedOn: null }),
      "forbidden",
    );

    // Carers may change their own entries but not the owner's.
    const ownersEntry = await createRecord(alice, pet.id, "symptoms", {
      occurredAt: "2026-11-02T09:00:00Z",
      symptom: "Itching",
    });
    await updateRecord(bob, pet.id, "symptoms", entry.id, { severity: "moderate" });
    await expectHttp(deleteRecord(bob, pet.id, "symptoms", ownersEntry.id), "forbidden");
  });

  it("rejects a breed from another species and requires text for Other", async () => {
    await expectHttp(createPet(alice, dog({ speciesSlug: "cat" })), "validation_failed");
    await expectHttp(
      createPet(alice, dog({ speciesSlug: "other", breedSlugs: [] })),
      "validation_failed",
    );
    const other = await createPet(
      alice,
      dog({ speciesSlug: "other", breedSlugs: [], speciesOther: "Alpaca" }),
    );
    expect(other.speciesOther).toBe("Alpaca");
  });

  it("keeps horse height only for horses", async () => {
    const horse = await createPet(
      alice,
      dog({ name: "Pony", speciesSlug: "horse", breedSlugs: ["connemara"], heightInches: 58 }),
    );
    expect(horse.heightInches).toBe(58);
    const cat = await createPet(
      alice,
      dog({ name: "Tom", speciesSlug: "cat", breedSlugs: [], heightInches: 58 }),
    );
    expect(cat.heightInches).toBeNull();
  });

  it("records CRUD, latest weight and newest-first ordering", async () => {
    const pet = await createPet(alice, dog({ name: "Weighed" }));
    await createRecord(alice, pet.id, "weights", { measuredOn: "2026-09-01", weightGrams: 24000 });
    const latest = await createRecord(alice, pet.id, "weights", {
      measuredOn: "2026-10-01",
      weightGrams: 25500,
    });
    expect((await getPet(alice, pet.id)).latestWeight).toEqual({
      grams: 25500,
      measuredOn: "2026-10-01",
    });
    expect((await listRecords(alice, pet.id, "weights")).map((r) => r.id)[0]).toBe(latest.id);

    const updated = await updateRecord(alice, pet.id, "weights", latest.id, { weightGrams: 25000 });
    expect(updated.weightGrams).toBe(25000);
    await deleteRecord(alice, pet.id, "weights", latest.id);
    expect((await listRecords(alice, pet.id, "weights")).length).toBe(1);
  });

  it("memorial mode makes records read-only and stops reminders", async () => {
    const pet = await createPet(alice, dog({ name: "Remembered" }));
    const soon = new Date(Date.parse(`${todayInLondon()}T00:00:00Z`) + 5 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    await createRecord(alice, pet.id, "vaccinations", {
      vaccine: "Lepto",
      givenOn: "2025-11-01",
      nextDueOn: soon,
    });
    expect((await listReminders(alice, pet.id)).length).toBe(1);

    await changePetStatus(alice, pet.id, { status: "deceased", deceasedOn: "2026-10-30" });
    expect((await getPet(alice, pet.id)).status).toBe("deceased");
    expect(await listReminders(alice, pet.id)).toEqual([]);
    await expectHttp(
      createRecord(alice, pet.id, "weights", { measuredOn: "2026-11-01", weightGrams: 1 }),
      "conflict",
    );
    // Records stay readable.
    expect((await listRecords(alice, pet.id, "vaccinations")).length).toBe(1);
  });

  it("archived pets leave the active list", async () => {
    const pet = await createPet(alice, dog({ name: "Archived" }));
    await changePetStatus(alice, pet.id, { status: "archived", deceasedOn: null });
    expect((await listPets(alice)).map((p) => p.id)).not.toContain(pet.id);
    expect((await listPets(alice, "archived")).map((p) => p.id)).toContain(pet.id);
  });

  it("never stores a dose suggestion: medication dose is the vet's text, verbatim", async () => {
    const pet = await createPet(alice, dog({ name: "Meds" }));
    const med = await createRecord(alice, pet.id, "medications", {
      name: "Antibiotic",
      doseAsPrescribed: "1 tablet (as on the label)",
      frequency: "Twice daily",
      startOn: "2026-11-01",
    });
    const [row] = await db()
      .select()
      .from(schema.medications)
      .where(eq(schema.medications.id, med.id));
    expect(row?.doseAsPrescribed).toBe("1 tablet (as on the label)");
  });
});
