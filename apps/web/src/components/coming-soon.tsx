import { Card, CardContent } from "@pintopets/ui/components/card";
import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function ComingSoon({ title, body }: { title: string; body: string }) {
  const t = await getTranslations("placeholder");
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <Card className="mt-6">
        <CardContent className="flex items-start gap-4">
          <Sparkles className="text-primary mt-0.5 size-6 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{t("comingSoon")}</p>
            <p className="text-muted-foreground mt-1">{body}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
