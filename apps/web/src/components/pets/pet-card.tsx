import type { Pet, Reminder } from "@pintopets/api-contract";
import { cn } from "@pintopets/ui/lib/utils";
import { CalendarClock, CheckCircle2, Heart, Scale } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { formatAge, formatDate, formatWeight, relativeDays } from "@/lib/format";

export function petSubtitle(pet: Pet): string {
  const kind = pet.speciesOther ?? pet.species.name;
  const breeds = pet.breeds.map((b) => b.name).join(" × ");
  return breeds ? `${kind} · ${breeds}` : kind;
}

/** Short species label for the photo chip ("Horse, pony or donkey" → "Horse"). */
function speciesChip(pet: Pet): string {
  const name = pet.speciesOther ?? pet.species.name;
  return name.split(/[,(]/)[0]?.trim() || name;
}

const STATE_STYLE: Record<Reminder["state"], string> = {
  overdue: "bg-urgent-soft text-urgent",
  due_soon: "bg-warning text-warning-foreground",
  upcoming: "bg-muted text-muted-foreground",
};

/**
 * A pet in a grid: their photo first (that's how people recognise their pets),
 * then name, breed, age and weight, and the next thing that's due.
 */
export function PetCard({
  pet,
  nextReminder,
  todayIso,
  headingLevel = 2,
}: {
  pet: Pet;
  nextReminder?: Reminder;
  todayIso: string;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const age = formatAge(pet.dateOfBirth, todayIso);
  const deceased = pet.status === "deceased";
  return (
    <article className="group bg-card hover:border-primary/40 focus-within:ring-ring relative flex h-full flex-col overflow-hidden rounded-2xl border shadow-xs transition-[border-color,box-shadow] focus-within:ring-2 hover:shadow-md">
      <div className="bg-muted relative aspect-[4/3] overflow-hidden">
        {pet.profilePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image
          <img
            src={pet.profilePhoto.thumbUrl}
            alt=""
            loading="lazy"
            className={cn(
              "size-full object-cover object-[50%_30%] transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none",
              deceased && "grayscale",
            )}
          />
        ) : (
          <span
            aria-hidden
            className="text-primary-foreground font-display flex size-full items-center justify-center bg-[linear-gradient(135deg,var(--primary)_55%,var(--accent-foreground)_55%)] text-6xl font-semibold"
          >
            {pet.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="bg-background/90 text-foreground absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur">
          {speciesChip(pet)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <Heading className="text-h4 font-sans font-semibold tracking-normal">
          <Link
            href={`/pets/${pet.id}` as Route}
            className="outline-none after:absolute after:inset-0"
          >
            {pet.name}
          </Link>
        </Heading>
        <p className="text-muted-foreground truncate text-sm">{petSubtitle(pet)}</p>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {age ? <span>{`${pet.dateOfBirthIsEstimate ? "About " : ""}${age}`}</span> : null}
          {pet.latestWeight ? (
            <span className="inline-flex items-center gap-1">
              <Scale className="size-3.5" aria-hidden />
              {formatWeight(pet.latestWeight.grams)}
            </span>
          ) : null}
        </p>

        <div className="mt-auto pt-3">
          {deceased ? (
            <p className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
              <Heart className="size-4" aria-hidden /> In loving memory
              {pet.deceasedOn ? ` · ${formatDate(pet.deceasedOn)}` : ""}
            </p>
          ) : nextReminder ? (
            <p
              className={cn(
                "flex min-w-0 items-start gap-2 rounded-lg px-2.5 py-2 text-xs",
                STATE_STYLE[nextReminder.state],
              )}
            >
              <CalendarClock className="mt-px size-3.5 shrink-0" aria-hidden />
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold">
                  {nextReminder.state === "overdue"
                    ? `Overdue · ${relativeDays(nextReminder.daysUntil)}`
                    : `Due ${relativeDays(nextReminder.daysUntil)}`}
                </span>
                <span className="truncate">{nextReminder.title}</span>
              </span>
            </p>
          ) : pet.status === "active" ? (
            <p className="text-success inline-flex items-center gap-1.5 text-xs font-semibold">
              <CheckCircle2 className="size-3.5" aria-hidden /> Nothing due
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
