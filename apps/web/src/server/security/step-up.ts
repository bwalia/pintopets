import "server-only";
import { cookies } from "next/headers";
import { env } from "@/env";
import type { Actor } from "../auth";
import { HttpError } from "../http";
import { SESSION_COOKIE, SESSION_DAYS, signToken, verifyToken } from "../session";
import { verifySecondFactor } from "./service";

/**
 * Step-up: sensitive actions (turning 2FA off, new recovery codes, exporting all
 * data, deleting a pet or the whole account; later ownership transfers, certificates and microchips)
 * need an authenticator code from the last 10 minutes, whatever the sign-in method.
 */
export const STEP_UP_COOKIE = "pp_stepup";
export const STEP_UP_MINUTES = 10;

function secret(): string {
  const s = env().SESSION_SECRET;
  if (!s) throw new HttpError("service_unavailable", "Sign-in isn't set up on this site yet.");
  return s;
}

export async function hasStepUp(actor: Pick<Actor, "id">): Promise<boolean> {
  const value = (await cookies()).get(STEP_UP_COOKIE)?.value;
  const p = verifyToken<{ sub: string; exp: number }>(value, secret(), "step-up");
  return p?.sub === actor.id;
}

export async function requireStepUp(actor: Pick<Actor, "id">): Promise<void> {
  if (!(await hasStepUp(actor))) {
    throw new HttpError(
      "step_up_required",
      "Enter a code from your authenticator app to continue.",
    );
  }
}

/** Checks a TOTP or recovery code, then marks this browser as recently verified. */
export async function grantStepUp(actor: Pick<Actor, "id">, code: string): Promise<void> {
  await verifySecondFactor(actor, code);
  await markStepUp(actor);
}

/**
 * Marks this browser as recently verified WITHOUT checking a code. Only for
 * callers that have just verified one themselves (e.g. confirming enrolment).
 */
export async function markStepUp(actor: Pick<Actor, "id">): Promise<void> {
  (await cookies()).set(
    STEP_UP_COOKIE,
    signToken(
      { sub: actor.id, exp: Math.floor(Date.now() / 1000) + STEP_UP_MINUTES * 60 },
      secret(),
      "step-up",
    ),
    {
      httpOnly: true,
      secure: env().APP_URL.startsWith("https://"),
      sameSite: "strict",
      path: "/",
      maxAge: STEP_UP_MINUTES * 60,
    },
  );
}

export async function clearStepUp(): Promise<void> {
  (await cookies()).delete(STEP_UP_COOKIE);
}

/** How recently someone without two-factor sign-in must have signed in to delete their account. */
export const RECENT_SIGN_IN_MINUTES = 10;

/** When this browser's session was issued (sessions last exactly SESSION_DAYS), or null. */
export async function signedInAt(
  actor: Pick<Actor, "id">,
  now = Date.now(),
): Promise<number | null> {
  const p = verifyToken<{ sub: string; exp: number }>(
    (await cookies()).get(SESSION_COOKIE)?.value,
    secret(),
    "session",
    now,
  );
  if (p?.sub !== actor.id) return null;
  return (p.exp - SESSION_DAYS * 86_400) * 1000;
}

export async function signedInRecently(
  actor: Pick<Actor, "id">,
  now = Date.now(),
): Promise<boolean> {
  const at = await signedInAt(actor, now);
  return at !== null && now - at <= RECENT_SIGN_IN_MINUTES * 60_000;
}

/**
 * Confirming it's really them before deleting the account. With two-factor
 * sign-in on: an authenticator code (step-up). Without it (most people, and
 * everyone who signs in with Google or Apple), asking them to set up 2FA first
 * would make deletion needlessly hard (App Store guideline 5.1.1(v)), so a
 * sign-in in the last RECENT_SIGN_IN_MINUTES is enough instead.
 */
export async function requireDeletionConfirmation(
  actor: Pick<Actor, "id">,
  twoFactorOn: boolean,
): Promise<void> {
  if (twoFactorOn) return requireStepUp(actor);
  if (await signedInRecently(actor)) return;
  throw new HttpError("step_up_required", "Please sign in again to confirm it's you.", {
    reason: "recent_sign_in_required",
  });
}
