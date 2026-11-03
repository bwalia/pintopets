import "server-only";
import { schema } from "@pintopets/db";
import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { env } from "@/env";
import { db } from "./db";
import { HttpError } from "./http";

const { users } = schema;

export type UserRole = "owner" | "professional" | "moderator" | "admin";

export interface Actor {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  /** True when this is the shared demo account (DEMO_AUTH). */
  demo: boolean;
}

export const DEMO_EMAIL = "demo@pintopets.app";

let demoActor: Promise<Actor> | undefined;

async function loadDemoActor(): Promise<Actor> {
  const [existing] = await db().select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  const row =
    existing ??
    (
      await db()
        .insert(users)
        .values({
          email: DEMO_EMAIL,
          emailVerified: true,
          name: "Demo owner",
          displayName: "Demo owner",
          role: "owner",
        })
        .onConflictDoNothing({ target: users.email })
        .returning()
    )[0] ??
    (await db().select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1))[0];
  if (!row) throw new Error("Could not create the demo user");
  return { id: row.id, email: row.email, displayName: row.displayName, role: row.role, demo: true };
}

/**
 * The signed-in user, or null.
 *
 * Until real sign-in (Better Auth: Google + magic link, M2) exists, DEMO_AUTH
 * signs everyone in as one shared demo account. env() refuses DEMO_AUTH on prod.
 * Every service takes the Actor as a parameter, so swapping this function for a
 * session lookup is the only change M2 needs here.
 */
export async function currentUser(): Promise<Actor | null> {
  // The signed-in user only exists at request time: never prerender at build
  // time (when there is no database) a page that depends on it.
  await connection();
  if (env().DEMO_AUTH) {
    demoActor ??= loadDemoActor().catch((error: unknown) => {
      demoActor = undefined;
      throw error;
    });
    return demoActor;
  }
  return null;
}

export async function requireUser(): Promise<Actor> {
  const user = await currentUser();
  if (!user) throw new HttpError("unauthenticated", "Please sign in to continue.");
  return user;
}
