import type { Pet, Reminder } from "@pintopets/api-contract";
import { Badge } from "@pintopets/ui/components/badge";
import { Card, CardContent } from "@pintopets/ui/components/card";
import { CalendarClock, Heart } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { formatAge, formatDate, formatWeight, relativeDays } from "@/lib/format";
import { PetAvatar } from "./pet-avatar";

export function petSubtitle(pet: Pet): string {
  const kind = pet.speciesOther ?? pet.species.name;
  const breeds = pet.breeds.map((b) => b.name).join(" × ");
  return breeds ? `${kind} · ${breeds}` : kind;
}

export function PetCard({
  pet,
  nextReminder,
  todayIso,
}: {
  pet: Pet;
  nextReminder?: Reminder;
  todayIso: string;
}) {
  const age = formatAge(pet.dateOfBirth, todayIso);
  return (
    <Card className="hover:border-primary/40 relative h-full transition-colors">
      <CardContent className="flex items-start gap-4 p-4">
        <PetAvatar pet={pet} />
        <div className="min-w-0 flex-1">
          <h2 className="text-h4 font-sans font-semibold tracking-normal">
            <Link
              href={`/pets/${pet.id}` as Route}
              className="after:absolute after:inset-0 after:rounded-xl"
            >
              {pet.name}
            </Link>
          </h2>
          <p className="text-muted-foreground truncate text-sm">{petSubtitle(pet)}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {[
              age && `${pet.dateOfBirthIsEstimate ? "About " : ""}${age}`,
              pet.latestWeight && formatWeight(pet.latestWeight.grams),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {pet.status === "deceased" ? (
            <p className="text-muted-foreground mt-2 inline-flex items-center gap-1 text-sm">
              <Heart className="size-4" aria-hidden /> In loving memory
              {pet.deceasedOn ? ` · ${formatDate(pet.deceasedOn)}` : ""}
            </p>
          ) : nextReminder ? (
            <p className="mt-2">
              <Badge
                variant={
                  nextReminder.state === "overdue"
                    ? "urgent"
                    : nextReminder.state === "due_soon"
                      ? "warning"
                      : "secondary"
                }
              >
                <CalendarClock aria-hidden />
                {nextReminder.title} {relativeDays(nextReminder.daysUntil)}
              </Badge>
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
