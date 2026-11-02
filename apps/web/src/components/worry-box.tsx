import { Button } from "@pintopets/ui/components/button";
import { Textarea } from "@pintopets/ui/components/textarea";
import { getTranslations } from "next-intl/server";

/**
 * The home page's main entry point (section 1.1). For now it hands the question
 * to /ask; pet picking, triage and follow-up questions arrive in M7.
 * A plain GET form, so it works before JavaScript loads.
 */
export async function WorryBox() {
  const t = await getTranslations("home");
  return (
    <form action="/ask" method="get" className="flex flex-col gap-3">
      <label htmlFor="worry" className="sr-only">
        {t("label")}
      </label>
      <Textarea
        id="worry"
        name="q"
        required
        minLength={3}
        maxLength={2000}
        rows={3}
        placeholder={t("placeholder")}
        aria-describedby="worry-disclaimer"
        className="min-h-28 text-lg shadow-sm"
      />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p id="worry-disclaimer" className="text-muted-foreground text-sm">
          {t("disclaimer")}
        </p>
        <Button type="submit" size="lg" className="sm:min-w-32">
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
