import type { Pet, Reminder } from "@pintopets/api-contract";
import { Badge } from "@pintopets/ui/components/badge";
import { cn } from "@pintopets/ui/lib/utils";
import { Bug, CalendarClock, ChevronRight, Pill, Stethoscope, Syringe, Wrench } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { formatDate, relativeDays } from "@/lib/format";
import { PetAvatar } from "./pets/pet-avatar";

const KIND_TAB: Record<Reminder["kind"], string> = {
  vaccination: "health#section-vaccinations",
  parasite_treatment: "health#section-parasite-treatments",
  horse_care: "health#section-horse-care",
  medication_end: "health#section-medications",
  vet_follow_up: "health#section-vet-visits",
};

const KIND_ICON = {
  vaccination: Syringe,
  parasite_treatment: Bug,
  horse_care: Wrench,
  medication_end: Pill,
  vet_follow_up: Stethoscope,
} satisfies Record<Reminder["kind"], unknown>;

export function reminderBadge(r: Reminder) {
  return (
    <Badge
      className="shrink-0 whitespace-nowrap"
      variant={r.state === "overdue" ? "urgent" : r.state === "due_soon" ? "warning" : "secondary"}
    >
      {r.state === "overdue" ? `Overdue · ${relativeDays(r.daysUntil)}` : relativeDays(r.daysUntil)}
    </Badge>
  );
}

/**
 * Reminders as one list: the pet's photo (when `pets` is given) or the kind of
 * care, what's due, when, and how urgent. Each row opens the pet's record.
 */
export function ReminderList({
  reminders,
  showPet = true,
  pets,
}: {
  reminders: Reminder[];
  showPet?: boolean;
  pets?: Pet[];
}) {
  const byId = new Map(pets?.map((p) => [p.id, p]));
  return (
    <ul className="bg-card divide-y overflow-hidden rounded-2xl border shadow-xs">
      {reminders.map((r) => {
        const pet = byId.get(r.petId);
        const Icon = KIND_ICON[r.kind] ?? CalendarClock;
        return (
          <li
            key={`${r.kind}-${r.recordId}`}
            className="hover:bg-muted/50 relative transition-colors"
          >
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
              <span className="row-span-2 flex sm:row-span-1">
                {pet ? (
                  <span className="relative shrink-0">
                    <PetAvatar pet={pet} size="sm" />
                    <span
                      className={cn(
                        "border-card absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border-2",
                        r.state === "overdue"
                          ? "bg-urgent text-urgent-foreground"
                          : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      <Icon className="size-3" aria-hidden />
                    </span>
                  </span>
                ) : (
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      r.state === "overdue"
                        ? "bg-urgent-soft text-urgent"
                        : "bg-secondary text-primary",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <p className="line-clamp-2 font-semibold">
                  <Link
                    href={`/pets/${r.petId}/${KIND_TAB[r.kind]}` as Route}
                    className="after:absolute after:inset-0"
                  >
                    {showPet ? `${r.petName}: ` : ""}
                    {r.title}
                  </Link>
                </p>
                <p className="text-muted-foreground text-sm">{formatDate(r.dueOn)}</p>
              </div>
              <span className="col-start-2 row-start-2 justify-self-start sm:col-start-3 sm:row-start-1">
                {reminderBadge(r)}
              </span>
              <ChevronRight
                className="text-muted-foreground col-start-3 row-span-2 row-start-1 size-4 sm:col-start-4 sm:row-span-1"
                aria-hidden
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
