"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/env";
import { HttpError } from "@/server/http";
import { verifySecondFactor } from "@/server/security/service";
import {
  encodeSession,
  PENDING_COOKIE,
  safeNext,
  SESSION_COOKIE,
  SESSION_DAYS,
  signToken,
  TRUSTED_COOKIE,
  verifyToken,
} from "@/server/session";

const Input = z.object({
  code: z.string().trim().min(6).max(20),
  trust: z.boolean(),
  next: z.string().max(512),
});

export type VerifyResult = { ok: false; message: string } | undefined;

/** Completes a sign-in that is waiting for the authenticator code. */
export async function verifySignInAction(input: unknown): Promise<VerifyResult> {
  const secret = env().SESSION_SECRET;
  const parsed = Input.safeParse(input);
  if (!secret || !parsed.success)
    return { ok: false, message: "Please enter the 6-digit code from your app." };
  const jar = await cookies();
  const pending = verifyToken<{ sub: string; email: string; name: string; exp: number }>(
    jar.get(PENDING_COOKIE)?.value,
    secret,
    "pending",
  );
  if (!pending) return { ok: false, message: "This sign-in has expired. Please sign in again." };

  try {
    await verifySecondFactor({ id: pending.sub }, parsed.data.code);
  } catch (error) {
    if (error instanceof HttpError) return { ok: false, message: error.message };
    throw error;
  }

  const secure = env().APP_URL.startsWith("https://");
  jar.delete(PENDING_COOKIE);
  jar.set(
    SESSION_COOKIE,
    encodeSession({ sub: pending.sub, email: pending.email, name: pending.name }, secret),
    {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 86_400,
    },
  );
  if (parsed.data.trust) {
    jar.set(
      TRUSTED_COOKIE,
      signToken(
        { sub: pending.sub, exp: Math.floor(Date.now() / 1000) + 30 * 86_400 },
        secret,
        "trusted",
      ),
      {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 86_400,
      },
    );
  }
  redirect(safeNext(parsed.data.next) as never);
}
