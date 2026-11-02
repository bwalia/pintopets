import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./lib/sentry-options";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(sentryOptions());
  }
}

// Reports errors from server components, route handlers and server actions.
export const onRequestError = Sentry.captureRequestError;
