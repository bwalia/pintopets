import { z } from "zod";
import { ApiError } from "../errors";
import { registry } from "../registry";

/**
 * Mobile sign-in: authorization code + PKCE (RFC 7636). The app opens
 * /auth/app/start?challenge=<base64url(SHA-256(verifier))> in a system browser
 * sheet, receives pintopets://auth/callback?code=…, then exchanges it here.
 * Send the token as `Authorization: Bearer <token>` on every /api/v1 call.
 */
export const AppTokenInput = z
  .object({
    code: z.string().min(10).max(2000),
    verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/, "Invalid verifier"),
  })
  .meta({ id: "AppTokenInput" });

export const AppTokenResponse = z
  .object({ data: z.object({ token: z.string(), expiresAt: z.iso.datetime() }) })
  .meta({ id: "AppTokenResponse" });

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/token",
  operationId: "exchangeAppCode",
  tags: ["Account"],
  summary: "Exchange a one-time app sign-in code and PKCE verifier for a 30-day bearer token",
  request: { body: { content: { "application/json": { schema: AppTokenInput } } } },
  responses: {
    200: {
      description: "Bearer token",
      content: { "application/json": { schema: AppTokenResponse } },
    },
    401: {
      description: "Code expired, forged, or the verifier doesn't match",
      content: { "application/json": { schema: ApiError } },
    },
    422: { description: "Invalid", content: { "application/json": { schema: ApiError } } },
  },
});
