import { Card, CardContent, CardDescription, CardTitle } from "@pintopets/ui/components/card";
import { MessageCircleQuestion, PawPrint, UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { UrgentHelp } from "@/components/urgent-help";
import { WorryBox } from "@/components/worry-box";

export default async function HomePage() {
  const t = await getTranslations("home");
  const features = [
    { icon: PawPrint, title: t("featurePetsTitle"), body: t("featurePetsBody") },
    { icon: MessageCircleQuestion, title: t("featureAskTitle"), body: t("featureAskBody") },
    { icon: UsersRound, title: t("featureCommunityTitle"), body: t("featureCommunityBody") },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <section aria-labelledby="worry-heading" className="flex flex-col gap-4 pt-2 md:pt-8">
        <h1 id="worry-heading" className="text-3xl leading-tight font-semibold md:text-4xl">
          {t("heading")}
        </h1>
        <p className="text-muted-foreground text-lg">{t("intro")}</p>
        <WorryBox />
      </section>

      <UrgentHelp />

      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="text-2xl font-semibold">
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
