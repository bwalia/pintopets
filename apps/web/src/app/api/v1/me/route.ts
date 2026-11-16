import { NextResponse } from "next/server";
import { assertDeletable, deleteMyData } from "@/server/account/delete";
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
 * Deletes all of the user's PintoPets data (UK GDPR erasure, App Store 5.1.1(v)),
 * then signs this browser out. The Workstation sign-in itself is separate and
 * is not deleted. Sensitive: needs an authenticator code (2FA on) or a sign-in
 * in the last 10 minutes (2FA off). Safe to retry.
 * App (bearer) callers should discard their token afterwards.
 */
export const DELETE = apiRoute(async () => {
  const actor = await requireUser();
  // Before step-up, so the demo account gets a clear answer.
  assertDeletable(actor);
  const { totpEnabled } = await securityStatus(actor);
  await requireDeletionConfirmation(actor, totpEnabled);
  const summary = await deleteMyData(actor);
  const res = NextResponse.json(
    { data: { deleted: summary } },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  for (const name of [SESSION_COOKIE, STEP_UP_COOKIE, PENDING_COOKIE, TRUSTED_COOKIE]) {
    res.cookies.delete(name);
  }
  return res;
});
