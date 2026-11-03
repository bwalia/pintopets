import { Badge } from "@pintopets/ui/components/badge";
import { Button } from "@pintopets/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@pintopets/ui/components/card";
import {
  CalendarClock,
  Camera,
  FileText,
  MessageCircleQuestion,
  NotebookPen,
  Scale,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { formatDate, formatDateTime, formatWeight, relativeDays } from "@/lib/format";
import { canAddRecord } from "@/lib/pet-permissions";
import { requireUser } from "@/server/auth";
import { listPhotos } from "@/server/media/photos";
import { loadPetForPage } from "@/server/pets/page-data";
import { listRecords } from "@/server/pets/records";
import { listReminders, todayInLondon } from "@/server/pets/reminders";

export default async function PetOverviewPage({ params }: PageProps<"/pets/[petId]">) {
  const user = await requireUser();
  const pet = await loadPetForPage(user, (await params).petId);
  const today = todayInLondon();
  const [reminders, conditions, allergies, meds, symptoms, photos] = await Promise.all([
    listReminders(user, pet.id),
    listRecords(user, pet.id, "conditions"),
    listRecords(user, pet.id, "allergies"),
    listRecords(user, pet.id, "medications"),
    listRecords(user, pet.id, "symptoms"),
    listPhotos(user, pet.id),
  ]);
  const activeConditions = conditions.filter((c) => c.status !== "resolved");
  const currentMeds = meds.filter((m) => !m.endOn || String(m.endOn) >= today);
  const base = `/pets/${pet.id}`;
  const memorial = pet.status === "deceased";

  const actions = [
    {
      href: `${base}/health#section-symptoms`,
      label: "Log a symptom",
      icon: NotebookPen,
      show: canAddRecord(pet, "symptoms"),
    },
    {
      href: `${base}/weight`,
      label: "Add weight",
      icon: Scale,
      show: canAddRecord(pet, "weights"),
    },
    {
      href: `${base}/photos`,
      label: "Add photo",
      icon: Camera,
      show: canAddRecord(pet, "vaccinations"),
    },
    {
      href: `/ask?pet=${pet.id}`,
      label: `Ask AI about ${pet.name}`,
      icon: MessageCircleQuestion,
      show: !memorial,
    },
    { href: `${base}/summary`, label: "Health summary (PDF)", icon: FileText, show: true },
  ].filter((a) => a.show);

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-wrap gap-2" aria-label="Quick actions">
        {actions.map((a) => (
          <li key={a.label}>
            <Button asChild variant="outline" size="sm">
              <Link href={a.href as Route}>
                <a.icon aria-hidden /> {a.label}
              </Link>
            </Button>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 md:grid-cols-2">
        {!memorial ? (
          <Card>
            <CardHeader>
              <CardTitle>Coming up</CardTitle>
            </CardHeader>
            <CardContent>
              {reminders.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nothing due in the next 90 days. Add next-due dates to vaccinations and treatments
                  to get reminders.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {reminders.slice(0, 5).map((r) => (
                    <li key={r.recordId} className="flex items-start justify-between gap-3 text-sm">
                      <span className="inline-flex items-start gap-2">
                        <CalendarClock
                          className="text-muted-foreground mt-0.5 size-4 shrink-0"
                          aria-hidden
                        />
                        {r.title}
                      </span>
                      <Badge
                        variant={
                          r.state === "overdue"
                            ? "urgent"
                            : r.state === "due_soon"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {r.state === "overdue" ? "Overdue" : formatDate(r.dueOn)} ·{" "}
                        {relativeDays(r.daysUntil)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Health at a glance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div>
              <p className="font-semibold">Latest weight</p>
              <p className="text-muted-foreground">
                {pet.latestWeight
                  ? `${formatWeight(pet.latestWeight.grams)} on ${formatDate(pet.latestWeight.measuredOn)}`
                  : "Not recorded yet"}
              </p>
            </div>
            <div>
              <p className="font-semibold">Conditions</p>
              <p className="text-muted-foreground">
                {activeConditions.length
                  ? activeConditions.map((c) => String(c.name)).join(", ")
                  : "None recorded"}
              </p>
            </div>
            <div>
              <p className="font-semibold">Allergies</p>
              <p className="text-muted-foreground">
                {allergies.length
                  ? allergies.map((a) => String(a.allergen)).join(", ")
                  : "None known"}
              </p>
            </div>
            <div>
              <p className="font-semibold">Current medicines</p>
              <p className="text-muted-foreground">
                {currentMeds.length
                  ? currentMeds
                      .map(
                        (m) =>
                          `${String(m.name)} (${String(m.doseAsPrescribed)}, ${String(m.frequency)})`,
                      )
                      .join("; ")
                  : "None"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent symptoms</CardTitle>
          </CardHeader>
          <CardContent>
            {symptoms.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nothing logged.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {symptoms.slice(0, 4).map((s) => (
                  <li key={s.id}>
                    <p className="font-semibold">{String(s.symptom)}</p>
                    <p className="text-muted-foreground">{formatDateTime(String(s.occurredAt))}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent>
            {photos.length === 0 ? (
              <p className="text-muted-foreground text-sm">No photos yet.</p>
            ) : (
              <ul className="grid grid-cols-4 gap-2">
                {photos.slice(0, 4).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`${base}/photos` as Route}
                      className="block aspect-square overflow-hidden rounded-lg border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image */}
                      <img
                        src={p.thumbUrl}
                        alt={p.altText ?? `Photo of ${pet.name}`}
                        className="size-full object-cover"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {pet.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{pet.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
