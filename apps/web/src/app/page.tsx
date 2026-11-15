import { ThreadListQuery } from "@pintopets/api-contract";
import { Card, CardContent, CardDescription, CardTitle } from "@pintopets/ui/components/card";
import { MessageCircleQuestion, PawPrint, UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Dashboard } from "@/components/dashboard";
import { UrgentHelp } from "@/components/urgent-help";
import { WorryBox } from "@/components/worry-box";
import { currentUser } from "@/server/auth";
import { listThreads } from "@/server/community/service";
import { listReminders, todayInLondon } from "@/server/pets/reminders";
import { listPets } from "@/server/pets/service";

export default async function HomePage() {
  const t = await getTranslations("home");
  const user = await currentUser();
  if (user) {
    const [pets, reminders, threads] = await Promise.all([
      listPets(user),
      listReminders(user),
      listThreads(user, ThreadListQuery.parse({}))
        .then((r) => r.data)
        .catch(() => []),
    ]);
    return (
      <Dashboard
        firstName={user.demo ? null : user.displayName.split(/[\s@]/)[0] || null}
        pets={pets}
        reminders={reminders}
        threads={threads}
        todayIso={todayInLondon()}
      />
    );
  }
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
