/**
 * Pure reminder rules (no I/O), unit-tested. A record "series" (the same
 * vaccine, parasite treatment type or horse-care task) only reminds from its
 * most recent entry, so a booster given today clears last year's due date.
 */
export type ReminderKind =
  "vaccination" | "parasite_treatment" | "horse_care" | "medication_end" | "vet_follow_up";

export interface DueItem {
  petId: string;
  petName: string;
  kind: ReminderKind;
  recordId: string;
  /** Groups entries of the same series, e.g. "rabies" or "worm". */
  series: string;
  /** When the series entry happened (to find the latest). */
  doneOn: string;
  title: string;
  dueOn: string | null;
}

export interface DerivedReminder {
  petId: string;
  petName: string;
  kind: ReminderKind;
  recordId: string;
  title: string;
  dueOn: string;
  state: "overdue" | "due_soon" | "upcoming";
  daysUntil: number;
}

export const DUE_SOON_DAYS = 14;
export const UPCOMING_DAYS = 90;
export const OVERDUE_DAYS = 180;

function daysBetween(fromIso: string, toIso: string): number {
  const ms = Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function deriveReminders(items: DueItem[], todayIso: string): DerivedReminder[] {
  const latest = new Map<string, DueItem>();
  for (const item of items) {
    const key = `${item.petId}|${item.kind}|${item.series.trim().toLowerCase()}`;
    const prev = latest.get(key);
    if (!prev || item.doneOn > prev.doneOn) latest.set(key, item);
  }

  const out: DerivedReminder[] = [];
  for (const item of latest.values()) {
    if (!item.dueOn) continue;
    const daysUntil = daysBetween(todayIso, item.dueOn);
    if (daysUntil < -OVERDUE_DAYS || daysUntil > UPCOMING_DAYS) continue;
    const state = daysUntil < 0 ? "overdue" : daysUntil <= DUE_SOON_DAYS ? "due_soon" : "upcoming";
    out.push({
      petId: item.petId,
      petName: item.petName,
      kind: item.kind,
      recordId: item.recordId,
      title: item.title,
      dueOn: item.dueOn,
      state,
      daysUntil,
    });
  }
  return out.sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.petName.localeCompare(b.petName));
}
