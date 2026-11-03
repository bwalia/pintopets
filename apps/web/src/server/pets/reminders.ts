import "server-only";
import type { Reminder } from "@pintopets/api-contract";
import type { Actor } from "../auth";
import { userView } from "../opsapi/client";
import { deriveReminders, type DueItem } from "./reminder-rules";

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
  const rows = await userView("due", actor.id, onlyPetId ? { pet_uuid: onlyPetId } : {});
  const s = (v: unknown) => (typeof v === "string" && v ? v : null);
  const items: DueItem[] = rows.map((r) => {
    const kind = String(r.kind) as DueItem["kind"];
    const label = String(r.label);
    const title =
      kind === "vaccination"
        ? `${label} vaccination due`
        : kind === "parasite_treatment"
          ? `${PARASITE_LABEL[label] ?? "Treatment"} due`
          : kind === "horse_care"
            ? `${HORSE_LABEL[label] ?? "Care"} due`
            : kind === "medication_end"
              ? `${label} course ends`
              : `Vet follow-up (${label})`;
    return {
      petId: String(r.pet_uuid),
      petName: String(r.pet_name),
      kind,
      recordId: String(r.record_uuid),
      series: String(r.series),
      doneOn: String(r.done_on),
      title,
      dueOn: s(r.due_on),
    };
  });
  return deriveReminders(items, todayInLondon());
}
