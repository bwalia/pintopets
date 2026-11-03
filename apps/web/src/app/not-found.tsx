import { Button } from "@pintopets/ui/components/button";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <h1 className="font-semibold">{t("title")}</h1>
      <p className="text-muted-foreground mt-3">{t("body")}</p>
      <Button asChild className="mt-6">
        <Link href="/">{t("home")}</Link>
      </Button>
    </div>
  );
}
