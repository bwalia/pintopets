import "server-only";
import { toValidationIssues } from "@pintopets/api-contract";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { HttpError } from "./http";

/**
 * Shared result shape and error handling for server actions. Lives outside the
 * "use server" files on purpose: anything exported from those becomes a
 * publicly callable endpoint.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors: Record<string, string>; code?: string };

export function issuesToFields(
  issues: { path: (string | number)[]; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "");
    if (key && !out[key]) out[key] = i.message;
  }
  return out;
}

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        message: "Please check the highlighted fields.",
        fieldErrors: issuesToFields(toValidationIssues(error)),
      };
    }
    if (error instanceof HttpError) {
      const issues = Array.isArray(error.details)
        ? (error.details as { path: (string | number)[]; message: string }[])
        : [];
      return {
        ok: false,
        message: error.message,
        fieldErrors: issuesToFields(issues),
        code: error.code,
      };
    }
    Sentry.captureException(error);
    console.error(error);
    return {
      ok: false,
      message: "Something went wrong on our side. Please try again.",
      fieldErrors: {},
    };
  }
}
