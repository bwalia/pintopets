import "server-only";
import { cookies } from "next/headers";
import { env } from "@/env";
import type { Actor } from "../auth";
import { HttpError } from "../http";
import { signToken, verifyToken } from "../session";
import { verifySecondFactor } from "./service";

/**
 * Step-up: sensitive actions (turning 2FA off, new recovery codes, exporting all
 * data, deleting a pet; later ownership transfers, certificates and microchips)
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
