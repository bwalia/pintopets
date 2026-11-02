import { Alert, AlertDescription, AlertTitle } from "@pintopets/ui/components/alert";
import { Button } from "@pintopets/ui/components/button";
import { Siren } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EXTERNAL_LINKS } from "@/lib/links";

/**
 * Always-visible urgent help. This is general guidance, not the triage engine
 * (that arrives in M7 and shows the red "Contact a vet now" banner).
 */
export async function UrgentHelp() {
  const t = await getTranslations("home");
  const tA11y = await getTranslations("a11y");
  return (
    <Alert variant="warning" role="note">
      <Siren aria-hidden />
      <AlertTitle>{t("urgentTitle")}</AlertTitle>
      <AlertDescription>
        <p>{t("urgentBody")}</p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <a href={EXTERNAL_LINKS.findAVet} target="_blank" rel="noopener noreferrer">
            {t("findVet")}
            <span className="sr-only"> {tA11y("opensInNewTab")}</span>
          </a>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
