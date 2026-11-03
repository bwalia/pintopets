import type { Reminder } from "@pintopets/api-contract";
import { Badge } from "@pintopets/ui/components/badge";
import { Card, CardContent } from "@pintopets/ui/components/card";
import { CalendarClock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { formatDate, relativeDays } from "@/lib/format";

const KIND_TAB: Record<Reminder["kind"], string> = {
  vaccination: "health#section-vaccinations",
  parasite_treatment: "health#section-parasite-treatments",
  horse_care: "health#section-horse-care",
  medication_end: "health#section-medications",
  vet_follow_up: "health#section-vet-visits",
};

export function ReminderList({
  reminders,
  showPet = true,
}: {
  reminders: Reminder[];
  showPet?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {reminders.map((r) => (
        <li key={`${r.kind}-${r.recordId}`}>
          <Card className="hover:border-primary/40 relative transition-colors">
            <CardContent className="flex items-center gap-3 p-4">
              <CalendarClock
                className={`size-5 shrink-0 ${r.state === "overdue" ? "text-destructive" : "text-primary"}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  <Link
                    href={`/pets/${r.petId}/${KIND_TAB[r.kind]}` as Route}
                    className="after:absolute after:inset-0 after:rounded-xl"
                  >
                    {showPet ? `${r.petName}: ` : ""}
                    {r.title}
                  </Link>
                </p>
                <p className="text-muted-foreground text-sm">{formatDate(r.dueOn)}</p>
              </div>
              <Badge
                variant={
                  r.state === "overdue"
                    ? "urgent"
                    : r.state === "due_soon"
                      ? "warning"
                      : "secondary"
                }
              >
                {r.state === "overdue"
                  ? `Overdue · ${relativeDays(r.daysUntil)}`
                  : relativeDays(r.daysUntil)}
              </Badge>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
