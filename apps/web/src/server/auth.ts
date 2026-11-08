import "server-only";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { env } from "@/env";
import { verifyAppToken } from "./app-auth";
import { HttpError } from "./http";
import { decodeSession, SESSION_COOKIE } from "./session";

export type UserRole = "owner" | "professional" | "moderator" | "admin";

export interface Actor {
  /** OpsAPI user uuid. */
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  /** True when this is the shared demo account (DEMO_AUTH). */
  demo: boolean;
}

/** Fixed id for the shared demo account (never an OpsAPI user). */
export const DEMO_USER_ID = "d3e0d3e0-0000-4000-8000-00000000d3e0";

/** Moderators are listed by email in MODERATOR_EMAILS; everyone else is an owner. */
function roleFor(email: string): UserRole {
  return env().MODERATOR_EMAILS.includes(email.toLowerCase()) ? "moderator" : "owner";
}

export function isModerator(actor: Pick<Actor, "role">): boolean {
  return actor.role === "moderator" || actor.role === "admin";
}

/**
 * The signed-in user, or null. Users sign in with OpsAPI (hosted sign-in:
 * password + 2FA, or Google) and get a PintoPets session cookie. DEMO_AUTH (a
 * shared demo account) remains for local development and tests; env() refuses
 * it on prod.
 */
export async function currentUser(): Promise<Actor | null> {
  // Only exists at request time: never prerender at build time a page that depends on it.
  await connection();
  const secret = env().SESSION_SECRET;
  if (secret) {
    // The iOS app sends a bearer token; browsers send the session cookie.
    const authorization = (await headers()).get("authorization");
    const session = authorization
      ? verifyAppToken(authorization, secret)
      : decodeSession((await cookies()).get(SESSION_COOKIE)?.value, secret);
    if (authorization && !session) return null;
    if (session) {
      return {
        id: session.sub,
        email: session.email,
        displayName: session.name || session.email,
        role: roleFor(session.email),
        demo: false,
      };
    }
  }
  if (env().DEMO_AUTH) {
    return {
      id: DEMO_USER_ID,
      email: "demo@pintopets.app",
      displayName: "Demo owner",
      role: roleFor("demo@pintopets.app"),
      demo: true,
    };
  }
  return null;
}

export async function requireUser(): Promise<Actor> {
  const user = await currentUser();
  if (!user) throw new HttpError("unauthenticated", "Please sign in to continue.");
  return user;
}

/** Sign-in is available when OpsAPI and a session secret are configured. */
export function signInEnabled(): boolean {
  return Boolean(env().SESSION_SECRET);
}
