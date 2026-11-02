import { z } from "zod";

/**
 * Every API error uses this shape: `{ error: { code, message, details } }` (section 7).
 * Mobile clients switch on `code`; `message` is safe to show to users.
 */
export const ERROR_CODES = [
  "bad_request",
  "validation_failed",
  "unauthenticated",
  "forbidden",
  "step_up_required",
  "not_found",
  "conflict",
  "rate_limited",
  "payload_too_large",
  "unsupported_media_type",
  "internal_error",
  "service_unavailable",
] as const;

export const ErrorCode = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCode>;

/** HTTP status for each error code. One place, so web and mobile agree. */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  validation_failed: 422,
  unauthenticated: 401,
  forbidden: 403,
  step_up_required: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  payload_too_large: 413,
  unsupported_media_type: 415,
  internal_error: 500,
  service_unavailable: 503,
};

export const ApiError = z
  .object({
    error: z.object({
      code: ErrorCode,
      message: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .meta({ id: "ApiError", description: "Standard error response." });
export type ApiError = z.infer<typeof ApiError>;

/** Field-level validation issue, used in `details` for `validation_failed`. */
export const ValidationIssue = z
  .object({
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string(),
  })
  .meta({ id: "ValidationIssue" });
export type ValidationIssue = z.infer<typeof ValidationIssue>;

export function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((i) => ({
    path: i.path.filter((p): p is string | number => typeof p !== "symbol"),
    message: i.message,
  }));
}
