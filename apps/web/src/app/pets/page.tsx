import { Button } from "@pintopets/ui/components/button";
import { cn } from "@pintopets/ui/lib/utils";
import { PawPrint, Plus } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { z } from "zod";
import { PetCard } from "@/components/pets/pet-card";
import { SignedOut } from "@/components/signed-out";
import { currentUser } from "@/server/auth";
import { listReminders, todayInLondon } from "@/server/pets/reminders";
import { listPets } from "@/server/pets/service";

export const metadata: Metadata = { title: "My Pets" };

const TABS = [
  { status: "active", label: "My pets" },
  { status: "archived", label: "Archived" },
  { status: "deceased", label: "In memory" },
] as const;

const Query = z.object({ status: z.enum(["active", "archived", "deceased"]).catch("active") });

export default async function PetsPage({ searchParams }: PageProps<"/pets">) {
  const user = await currentUser();
  if (!user) return <SignedOut title="My Pets" />;
  const { status } = Query.parse({ status: (await searchParams).status });
  const [pets, reminders] = await Promise.all([listPets(user, status), listReminders(user)]);
  const today = todayInLondon();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-semibold">My Pets</h1>
          <p className="text-muted-foreground mt-1">
            Profiles, health records, photos and reminders for every pet you care for.
          </p>
        </div>
        <Button asChild>
          <Link href="/pets/new">
            <Plus aria-hidden /> Add pet
          </Link>
        </Button>
      </div>

      <nav aria-label="Filter pets" className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={(t.status === "active" ? "/pets" : `/pets?status=${t.status}`) as Route}
            aria-current={status === t.status ? "page" : undefined}
            className={cn(
              "-mb-px min-h-11 border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap",
              status === t.status
                ? "border-primary text-primary"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {pets.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border px-6 py-12 text-center">
          <PawPrint className="text-primary size-10" aria-hidden />
          <p className="text-h4 font-semibold">
            {status === "active"
              ? "Add your first pet"
              : status === "archived"
                ? "No archived pets"
                : "No pets here"}
          </p>
          {status === "active" ? (
            <>
              <p className="text-muted-foreground max-w-md">
                Keep their profile, vaccinations, medicines, vet visits, weight and photos in one
                place, with reminders when things are due.
              </p>
              <Button asChild className="mt-2">
                <Link href="/pets/new">
                  <Plus aria-hidden /> Add pet
                </Link>
              </Button>
            </>
          ) : null}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <li key={pet.id}>
              <PetCard
                pet={pet}
                nextReminder={reminders.find((r) => r.petId === pet.id)}
                todayIso={today}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
