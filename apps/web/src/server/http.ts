import "server-only";
import { type ErrorCode, ERROR_STATUS, toValidationIssues } from "@pintopets/api-contract";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Throw from any service or handler to return a standard API error
 * `{ error: { code, message, details } }` (section 7).
 */
export class HttpError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorResponse(code: ErrorCode, message: string, details?: unknown): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status: ERROR_STATUS[code] },
  );
}

/** Parse untrusted input (params, query, body) or throw a 422 with field issues. */
export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HttpError(
      "validation_failed",
      "Some of the information sent was not valid.",
      toValidationIssues(result.error),
    );
  }
  return result.data;
}

type Handler<Ctx> = (request: Request, context: Ctx) => Promise<Response>;

/**
 * Wraps every /api/v1 route handler: consistent error format, no stack traces
 * leaked to clients, unexpected errors reported to Sentry.
 */
export function apiRoute<Ctx>(handler: Handler<Ctx>): Handler<Ctx> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof HttpError) {
        return errorResponse(error.code, error.message, error.details);
      }
      if (error instanceof z.ZodError) {
        return errorResponse(
          "validation_failed",
          "Some of the information sent was not valid.",
          toValidationIssues(error),
        );
      }
      Sentry.captureException(error);
      console.error(error);
      return errorResponse("internal_error", "Something went wrong on our side. Please try again.");
    }
  };
}
