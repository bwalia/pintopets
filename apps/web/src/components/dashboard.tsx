import type { Pet, Reminder, ThreadSummary } from "@pintopets/api-contract";
import { Button } from "@pintopets/ui/components/button";
import { cn } from "@pintopets/ui/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  MessageSquare,
  PawPrint,
  Plus,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { categoryName } from "@/components/community/categories";
import { timeAgo } from "@/components/community/time-ago";
import { PetCard } from "@/components/pets/pet-card";
import { ReminderList } from "@/components/reminder-list";
import { UrgentHelp } from "@/components/urgent-help";
import { WorryBox } from "@/components/worry-box";

function greeting(now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", timeZone: "Europe/London" }).format(now),
  );
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function Stat({
  href,
  label,
  value,
  icon,
  tone,
}: {
  href: Route;
  label: string;
  value: number;
  icon: ReactNode;
  tone: "urgent" | "warning" | "primary";
}) {
  return (
    <Link
      href={href}
      className="bg-card hover:border-primary/40 flex flex-col items-start gap-2 rounded-2xl border p-3 shadow-xs transition-colors sm:flex-row sm:items-center sm:gap-3 sm:p-4"
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-11 [&_svg]:size-5",
          tone === "urgent" &&
            (value ? "bg-urgent-soft text-urgent" : "bg-muted text-muted-foreground"),
          tone === "warning" && "bg-warning text-warning-foreground",
          tone === "primary" && "bg-secondary text-primary",
        )}
      >
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="font-display text-2xl leading-none font-semibold">{value}</span>
        <span className="text-muted-foreground mt-1 text-xs leading-tight sm:text-sm">{label}</span>
      </span>
    </Link>
  );
}

function SectionHeading({
  id,
  title,
  href,
  linkLabel,
}: {
  id: string;
  title: string;
  href: Route;
  linkLabel: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-h3 font-sans font-semibold tracking-normal">
        {title}
      </h2>
      <Link
        href={href}
        className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
      >
        {linkLabel} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

/**
 * The signed-in home: what needs doing today, the pets themselves, a quick way
 * to ask about a worry, and what's happening in the community.
 */
export function Dashboard({
  firstName,
  pets,
  reminders,
  threads,
  todayIso,
}: {
  firstName: string | null;
  pets: Pet[];
  reminders: Reminder[];
  threads: ThreadSummary[];
  todayIso: string;
}) {
  const overdue = reminders.filter((r) => r.state === "overdue");
  const dueSoon = reminders.filter((r) => r.state === "due_soon");
  const attention = [...overdue, ...dueSoon];
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  }).format(new Date());
  const summary = overdue.length
    ? `${overdue.length} overdue ${overdue.length === 1 ? "reminder needs" : "reminders need"} your attention.`
    : dueSoon.length
      ? `${dueSoon.length} ${dueSoon.length === 1 ? "thing is" : "things are"} due in the next two weeks.`
      : "Everyone's up to date. Nice work.";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-1 md:pt-4">
        <div>
          <p className="text-muted-foreground text-sm font-semibold">{today}</p>
          <h1 className="mt-1 font-semibold">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-muted-foreground text-lead mt-1">{summary}</p>
        </div>
        <Button asChild>
          <Link href="/pets/new">
            <Plus aria-hidden /> Add pet
          </Link>
        </Button>
      </header>

      <section aria-label="At a glance" className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat
          href={"/reminders" as Route}
          label="Overdue"
          value={overdue.length}
          tone="urgent"
          icon={overdue.length ? <AlertCircle aria-hidden /> : <CheckCircle2 aria-hidden />}
        />
        <Stat
          href={"/reminders" as Route}
          label="Due soon"
          value={dueSoon.length}
          tone="warning"
          icon={<CalendarClock aria-hidden />}
        />
        <Stat
          href={"/pets" as Route}
          label={pets.length === 1 ? "Pet" : "Pets"}
          value={pets.length}
          tone="primary"
          icon={<PawPrint aria-hidden />}
        />
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="attention" className="flex flex-col gap-3">
            <SectionHeading
              id="attention"
              title="Needs attention"
              href={"/reminders" as Route}
              linkLabel="All reminders"
            />
            {attention.length ? (
              <ReminderList reminders={attention.slice(0, 6)} pets={pets} />
            ) : (
              <p className="bg-card text-muted-foreground flex items-center gap-3 rounded-2xl border p-5">
                <CheckCircle2 className="text-success size-5 shrink-0" aria-hidden />
                Nothing overdue or due in the next two weeks.
              </p>
            )}
          </section>

          <section aria-labelledby="your-pets" className="flex flex-col gap-3">
            <SectionHeading
              id="your-pets"
              title="Your pets"
              href={"/pets" as Route}
              linkLabel="My Pets"
            />
            {pets.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
                {pets.map((pet) => (
                  <li key={pet.id}>
                    <PetCard
                      pet={pet}
                      headingLevel={3}
                      nextReminder={reminders.find((r) => r.petId === pet.id)}
                      todayIso={todayIso}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border px-6 py-10 text-center">
                <PawPrint className="text-primary size-10" aria-hidden />
                <p className="text-muted-foreground max-w-sm">
                  Add your pets to keep their records, photos and reminders in one place.
                </p>
                <Button asChild>
                  <Link href="/pets/new">
                    <Plus aria-hidden /> Add your first pet
                  </Link>
                </Button>
              </div>
            )}
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6" aria-label="Help and community">
          <section
            aria-labelledby="worry-heading"
            className="bg-card flex flex-col gap-3 rounded-2xl border p-5 shadow-xs"
          >
            <h2 id="worry-heading" className="text-h4 font-sans font-semibold tracking-normal">
              What&apos;s worrying you about your pet?
            </h2>
            <WorryBox compact />
          </section>

          <UrgentHelp />

          <section aria-labelledby="community-heading" className="flex flex-col gap-3">
            <SectionHeading
              id="community-heading"
              title="Community"
              href={"/community" as Route}
              linkLabel="See all"
            />
            <ul className="bg-card divide-y overflow-hidden rounded-2xl border shadow-xs">
              {threads.slice(0, 4).map((t) => (
                <li key={t.id} className="hover:bg-muted/50 relative p-4 transition-colors">
                  <p className="text-muted-foreground text-xs font-semibold">
                    {categoryName(t.category)}
                  </p>
                  <p className="mt-0.5 line-clamp-2 font-semibold">
                    <Link
                      href={`/community/t/${t.id}` as Route}
                      className="after:absolute after:inset-0"
                    >
                      {t.title}
                    </Link>
                  </p>
                  <p className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="size-3.5" aria-hidden />
                      {t.replyCount} {t.replyCount === 1 ? "reply" : "replies"}
                    </span>
                    <span>{timeAgo(t.lastActivityAt)}</span>
                    {t.solved ? (
                      <span className="text-success inline-flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="size-3.5" aria-hidden /> Answered
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
              {threads.length === 0 ? (
                <li className="text-muted-foreground p-4 text-sm">No discussions yet.</li>
              ) : null}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
