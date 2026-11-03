import { Button } from "@pintopets/ui/components/button";
import { BellRing } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ReminderList } from "@/components/reminder-list";
import { SignedOut } from "@/components/signed-out";
import { currentUser } from "@/server/auth";
import { listReminders } from "@/server/pets/reminders";

export const metadata: Metadata = { title: "Reminders" };

export default async function RemindersPage() {
  const user = await currentUser();
  if (!user) return <SignedOut title="Reminders" />;
  const reminders = await listReminders(user);
  const groups = [
    { key: "overdue", title: "Overdue", items: reminders.filter((r) => r.state === "overdue") },
    {
      key: "due_soon",
      title: "Due in the next 2 weeks",
      items: reminders.filter((r) => r.state === "due_soon"),
    },
    {
      key: "upcoming",
      title: "Coming up (next 3 months)",
      items: reminders.filter((r) => r.state === "upcoming"),
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-semibold">Reminders</h1>
        <p className="text-muted-foreground mt-1">
          Vaccinations, flea, worm and tick treatments, medicine courses and vet follow-ups for all
          your pets.
        </p>
      </div>
      {reminders.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border px-6 py-12 text-center">
          <BellRing className="text-primary size-10" aria-hidden />
          <p className="text-h4 font-semibold">Nothing due in the next 3 months</p>
          <p className="text-muted-foreground max-w-md">
            When you record a vaccination or treatment, add its next-due date and it will show up
            here.
          </p>
          <Button asChild variant="secondary" className="mt-2">
            <Link href="/pets">Go to My Pets</Link>
          </Button>
        </div>
      ) : (
        groups
          .filter((g) => g.items.length)
          .map((g) => (
            <section key={g.key} aria-labelledby={`rem-${g.key}`} className="flex flex-col gap-3">
              <h2 id={`rem-${g.key}`} className="text-h3 font-sans font-semibold tracking-normal">
                {g.title}
              </h2>
              <ReminderList reminders={g.items} />
            </section>
          ))
      )}
      <p className="text-muted-foreground text-sm">
        Email reminders are coming soon. Pets in memorial mode never get reminders.
      </p>
    </div>
  );
}
