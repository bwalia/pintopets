"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Last-resort error page when the root layout itself fails. Translations and
 * styles may not be available here, so the text is inline and minimal.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-GB">
      <body
        style={{ fontFamily: "system-ui, sans-serif", padding: "3rem 1rem", textAlign: "center" }}
      >
        <h1>Something went wrong</h1>
        <p>Sorry, PintoPets couldn&apos;t load. Please refresh the page.</p>
        <p>If your pet needs help urgently, contact a vet.</p>
      </body>
    </html>
  );
}
