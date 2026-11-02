"use client";

import { Button } from "@pintopets/ui/components/button";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-12 text-center" role="alert">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="text-muted-foreground mt-3">{t("body")}</p>
      <Button onClick={reset} className="mt-6">
        {t("retry")}
      </Button>
    </div>
  );
}
