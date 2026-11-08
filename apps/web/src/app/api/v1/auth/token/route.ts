import { AppTokenInput } from "@pintopets/api-contract";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { issueAppToken, redeemAppCode } from "@/server/app-auth";
import { apiRoute, HttpError, readJson } from "@/server/http";

/** iOS app sign-in, step 4: swap a one-time code + PKCE verifier for a bearer token. */
export const POST = apiRoute(async (request: Request) => {
  const secret = env().SESSION_SECRET;
  if (!secret) throw new HttpError("service_unavailable", "Sign-in isn't set up on this site yet.");
  const { code, verifier } = await readJson(request, AppTokenInput);
  const user = redeemAppCode(code, verifier, secret);
  if (!user) {
    throw new HttpError("unauthenticated", "That sign-in has expired. Please sign in again.");
  }
  return NextResponse.json(
    { data: issueAppToken(user, secret) },
    { headers: { "Cache-Control": "no-store" } },
  );
});
