import { Card, CardContent } from "@pintopets/ui/components/card";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { UrgentHelp } from "@/components/urgent-help";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ask");
  return { title: t("title") };
}

const SearchParams = z.object({ q: z.string().trim().max(2000).optional().catch(undefined) });

export default async function AskPage({ searchParams }: PageProps<"/ask">) {
  const t = await getTranslations("ask");
  const { q } = SearchParams.parse(await searchParams);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      {q ? (
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-sm font-semibold">{t("yourQuestion")}</p>
            <p className="mt-1 text-lg">{q}</p>
          </CardContent>
        </Card>
      ) : null}
      <UrgentHelp />
      <Card>
        <CardContent>
          <p className="font-semibold">{t("comingTitle")}</p>
          <p className="text-muted-foreground mt-1">{t("comingBody")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
