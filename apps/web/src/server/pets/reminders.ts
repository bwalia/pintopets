import "server-only";
import type { Reminder } from "@pintopets/api-contract";
import { schema } from "@pintopets/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Actor } from "../auth";
import { db } from "../db";
import { deriveReminders, type DueItem } from "./reminder-rules";

const s = schema;

const PARASITE_LABEL: Record<string, string> = {
  flea: "Flea treatment",
  worm: "Worming",
  tick: "Tick treatment",
  flea_and_tick: "Flea and tick treatment",
  lungworm: "Lungworm treatment",
  mite: "Mite treatment",
  other: "Parasite treatment",
};
const HORSE_LABEL: Record<string, string> = {
  farrier: "Farrier",
  dental: "Dental check",
  worm_egg_count: "Worm egg count",
};

export function todayInLondon(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now);
}

/**
 * Overdue and upcoming care for the user's active pets (memorial and archived
 * pets never get reminders). Optionally limited to one pet.
 */
export async function listReminders(
  actor: Pick<Actor, "id">,
  onlyPetId?: string,
): Promise<Reminder[]> {
  const petRows = await db()
    .select({ id: s.pets.id, name: s.pets.name })
    .from(s.petMembers)
    .innerJoin(s.pets, eq(s.pets.id, s.petMembers.petId))
    .where(
      and(
        eq(s.petMembers.userId, actor.id),
        eq(s.pets.status, "active"),
        isNull(s.pets.deletedAt),
        onlyPetId ? eq(s.pets.id, onlyPetId) : undefined,
      ),
    );
  if (petRows.length === 0) return [];
  const ids = petRows.map((p) => p.id);
  const nameOf = new Map(petRows.map((p) => [p.id, p.name]));
  const petName = (id: string) => nameOf.get(id) ?? "";

  const [vacc, para, horse, meds, visits] = await Promise.all([
    db().select().from(s.vaccinations).where(inArray(s.vaccinations.petId, ids)),
    db().select().from(s.parasiteTreatments).where(inArray(s.parasiteTreatments.petId, ids)),
    db().select().from(s.horseCareEntries).where(inArray(s.horseCareEntries.petId, ids)),
    db()
      .select()
      .from(s.medications)
      .where(and(inArray(s.medications.petId, ids), eq(s.medications.remindersEnabled, true))),
    db().select().from(s.vetVisits).where(inArray(s.vetVisits.petId, ids)),
  ]);

  const items: DueItem[] = [
    ...vacc.map((r) => ({
      petId: r.petId,
      petName: petName(r.petId),
      kind: "vaccination" as const,
      recordId: r.id,
      series: r.vaccine,
      doneOn: r.givenOn,
      title: `${r.vaccine} vaccination due`,
      dueOn: r.nextDueOn,
    })),
    ...para.map((r) => ({
      petId: r.petId,
      petName: petName(r.petId),
      kind: "parasite_treatment" as const,
      recordId: r.id,
      series: r.kind,
      doneOn: r.givenOn,
      title: `${PARASITE_LABEL[r.kind] ?? "Treatment"} due`,
      dueOn: r.nextDueOn,
    })),
    ...horse.map((r) => ({
      petId: r.petId,
      petName: petName(r.petId),
      kind: "horse_care" as const,
      recordId: r.id,
      series: r.kind,
      doneOn: r.doneOn,
      title: `${HORSE_LABEL[r.kind] ?? "Care"} due`,
      dueOn: r.nextDueOn,
    })),
    ...meds.map((r) => ({
      petId: r.petId,
      petName: petName(r.petId),
      kind: "medication_end" as const,
      recordId: r.id,
      series: r.id,
      doneOn: r.startOn,
      title: `${r.name} course ends`,
      dueOn: r.endOn,
    })),
    ...visits.map((r) => ({
      petId: r.petId,
      petName: petName(r.petId),
      kind: "vet_follow_up" as const,
      recordId: r.id,
      series: "vet-follow-up",
      doneOn: r.visitOn,
      title: `Vet follow-up (${r.reason})`,
      dueOn: r.followUpOn,
    })),
  ];
  return deriveReminders(items, todayInLondon());
}
