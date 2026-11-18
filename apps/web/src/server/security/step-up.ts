import "server-only";
import { cookies } from "next/headers";
import { env } from "@/env";
import { openReauth, REAUTH_COOKIE, REAUTH_MINUTES } from "../account/reauth";
import type { Actor } from "../auth";
import { HttpError } from "../http";
import { signToken, verifyToken } from "../session";
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

/** How recently someone must have signed in (through OpsAPI) to delete their account. */
export const RECENT_SIGN_IN_MINUTES = REAUTH_MINUTES;

/**
 * The OpsAPI token from a sign-in in the last RECENT_SIGN_IN_MINUTES that the
 * user made on purpose to delete their account ("Sign in again to continue"),
 * or null. Ordinary sign-ins don't count: OpsAPI needs the token itself to
 * close the identity, and only that flow keeps it.
 */
export async function freshSignInToken(actor: Pick<Actor, "id">): Promise<string | null> {
  return openReauth((await cookies()).get(REAUTH_COOKIE)?.value, actor.id, secret());
}

export async function signedInRecently(actor: Pick<Actor, "id">): Promise<boolean> {
  return (await freshSignInToken(actor)) !== null;
}

/**
 * Confirming it's really them before deleting the account, for everyone: a
 * fresh sign-in (which also lets OpsAPI close the Workstation identity and
 * revoke Sign in with Apple), plus an authenticator code if two-factor sign-in
 * is on. Returns the fresh OpsAPI token.
 */
export async function requireDeletionConfirmation(
  actor: Pick<Actor, "id">,
  twoFactorOn: boolean,
): Promise<string> {
  const token = await freshSignInToken(actor);
  if (!token) {
    throw new HttpError("step_up_required", "Please sign in again to confirm it's you.", {
      reason: "recent_sign_in_required",
    });
  }
  if (twoFactorOn) await requireStepUp(actor);
  return token;
}

export async function clearReauth(): Promise<void> {
  (await cookies()).delete(REAUTH_COOKIE);
}
