import { Alert, AlertDescription, AlertTitle } from "@pintopets/ui/components/alert";
import { Badge } from "@pintopets/ui/components/badge";
import { ChevronLeft, Heart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PetAvatar } from "@/components/pets/pet-avatar";
import { petSubtitle } from "@/components/pets/pet-card";
import { PetTabs } from "@/components/pets/pet-tabs";
import { SignedOut } from "@/components/signed-out";
import { formatAge, formatDate, formatHands } from "@/lib/format";
import { currentUser } from "@/server/auth";
import { loadPetForPage } from "@/server/pets/page-data";
import { todayInLondon } from "@/server/pets/reminders";

export async function generateMetadata({
  params,
}: LayoutProps<"/pets/[petId]">): Promise<Metadata> {
  const user = await currentUser();
  if (!user) return { title: "My Pets" };
  const pet = await loadPetForPage(user, (await params).petId);
  return { title: pet.name };
}

const SEX = { male: "Male", female: "Female", unknown: null } as const;

export default async function PetLayout({
  params,
  children,
}: LayoutProps<"/pets/[petId]"> & { children: ReactNode }) {
  const user = await currentUser();
  if (!user) return <SignedOut title="My Pets" />;
  const pet = await loadPetForPage(user, (await params).petId);
  const age = formatAge(pet.dateOfBirth, todayInLondon());
  const facts = [
    age && (pet.dateOfBirthIsEstimate ? `About ${age}` : age),
    SEX[pet.sex],
    pet.neutered === "yes" ? "Neutered" : pet.neutered === "no" ? "Not neutered" : null,
    formatHands(pet.heightInches),
  ].filter(Boolean);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <Link
        href="/pets"
        className="text-muted-foreground hover:text-foreground inline-flex min-h-11 w-fit items-center gap-1 text-sm font-semibold print:hidden"
      >
        <ChevronLeft className="size-4" aria-hidden /> My Pets
      </Link>
      <header className="flex items-center gap-4">
        <PetAvatar pet={pet} size="lg" />
        <div className="min-w-0">
          <h1 className="font-semibold break-words">{pet.name}</h1>
          <p className="text-muted-foreground">{petSubtitle(pet)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {facts.map((f) => (
              <Badge key={f} variant="outline">
                {f}
              </Badge>
            ))}
            {pet.status === "archived" ? <Badge variant="secondary">Archived</Badge> : null}
            {pet.myRole !== "owner" ? (
              <Badge variant="secondary">
                {pet.myRole === "carer" ? "You're a carer" : "Co-owner"}
              </Badge>
            ) : null}
          </div>
        </div>
      </header>
      {pet.status === "deceased" ? (
        <Alert>
          <Heart aria-hidden />
          <AlertTitle>In loving memory of {pet.name}</AlertTitle>
          <AlertDescription>
            <p>
              {pet.deceasedOn ? `${pet.name} passed away on ${formatDate(pet.deceasedOn)}. ` : ""}
              Their records and photos are kept safe here, and there will be no more reminders.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}
      <PetTabs petId={pet.id} />
      <div>{children}</div>
    </div>
  );
}
