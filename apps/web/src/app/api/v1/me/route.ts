import { NextResponse } from "next/server";
import { env } from "@/env";
import { assertDeletable, deleteMyData } from "@/server/account/delete";
import { closeOpsapiIdentity, REAUTH_COOKIE } from "@/server/account/reauth";
import { requireUser } from "@/server/auth";
import { apiRoute } from "@/server/http";
import { PENDING_COOKIE, SESSION_COOKIE, TRUSTED_COOKIE } from "@/server/session";
import { securityStatus } from "@/server/security/service";
import { requireDeletionConfirmation, STEP_UP_COOKIE } from "@/server/security/step-up";

export const GET = apiRoute(async () => {
  const me = await requireUser();
  return NextResponse.json({ data: me }, { headers: { "Cache-Control": "private, no-store" } });
});

/**
 * Deletes the account (UK GDPR erasure, App Store 5.1.1(v)): all of the user's
 * PintoPets data, then their OpsAPI (Workstation) sign-in, which OpsAPI
 * deactivates while revoking Sign in with Apple; then signs this browser out.
 * Needs a deliberate fresh sign-in (server/account/reauth.ts) and, with 2FA
 * on, an authenticator code. Data goes first: if closing the sign-in fails,
 * the user can still sign in and retry (every step is safe to repeat).
 * App (bearer) callers have no fresh sign-in: they are sent to the website.
 */
export const DELETE = apiRoute(async () => {
  const actor = await requireUser();
  // Before step-up, so the demo account gets a clear answer.
  assertDeletable(actor);
  const { totpEnabled } = await securityStatus(actor);
  const token = await requireDeletionConfirmation(actor, totpEnabled);
  const summary = await deleteMyData(actor);
  const identity = await closeOpsapiIdentity(env().OPSAPI_URL, token);
  const res = NextResponse.json(
    { data: { deleted: summary, signInClosed: true, appleRevoked: identity.appleRevoked } },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  for (const name of [
    SESSION_COOKIE,
    STEP_UP_COOKIE,
    PENDING_COOKIE,
    TRUSTED_COOKIE,
    REAUTH_COOKIE,
  ]) {
    res.cookies.delete(name);
  }
  return res;
});
