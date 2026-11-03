import { Card, CardContent, CardDescription, CardTitle } from "@pintopets/ui/components/card";
import { MessageCircleQuestion, PawPrint, Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import { Button } from "@pintopets/ui/components/button";
import { PetCard } from "@/components/pets/pet-card";
import { ReminderList } from "@/components/reminder-list";
import { currentUser } from "@/server/auth";
import { listReminders, todayInLondon } from "@/server/pets/reminders";
import { listPets } from "@/server/pets/service";
import { getTranslations } from "next-intl/server";
import { UrgentHelp } from "@/components/urgent-help";
import { WorryBox } from "@/components/worry-box";

export default async function HomePage() {
  const t = await getTranslations("home");
  const user = await currentUser();
  const [pets, reminders] = user
    ? await Promise.all([listPets(user), listReminders(user)])
    : [[], []];
  const today = todayInLondon();
  const features = [
    { icon: PawPrint, title: t("featurePetsTitle"), body: t("featurePetsBody") },
    { icon: MessageCircleQuestion, title: t("featureAskTitle"), body: t("featureAskBody") },
    { icon: UsersRound, title: t("featureCommunityTitle"), body: t("featureCommunityBody") },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <section aria-labelledby="worry-heading" className="flex flex-col gap-4 pt-2 md:pt-8">
        <h1 id="worry-heading" className="font-semibold">
          {t("heading")}
        </h1>
        <p className="text-muted-foreground text-lead">{t("intro")}</p>
        <WorryBox />
      </section>

      <UrgentHelp />

      {user ? (
        <section aria-labelledby="your-pets" className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <h2 id="your-pets" className="font-semibold">
              Your pets
            </h2>
            <Button asChild size="sm" variant="secondary">
              <Link href="/pets/new">
                <Plus aria-hidden /> Add pet
              </Link>
            </Button>
          </div>
          {pets.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {pets.slice(0, 4).map((pet) => (
                <li key={pet.id}>
                  <PetCard
                    pet={pet}
                    nextReminder={reminders.find((r) => r.petId === pet.id)}
                    todayIso={today}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              Add your pets to keep their records, photos and reminders in one place.
            </p>
          )}
          {reminders.length ? (
            <>
              <h2 className="mt-4 font-semibold">Coming up</h2>
              <ReminderList reminders={reminders.slice(0, 4)} />
            </>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="font-semibold">
          {t("featuresHeading")}
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-2">
                  <Icon className="text-primary size-6" aria-hidden />
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{body}</CardDescription>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
