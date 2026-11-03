import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { safeNext, SIGNIN_COOKIE } from "@/server/session";

/**
 * Starts sign-in on OpsAPI's hosted page (password + 2FA, or Google). A
 * one-time nonce travels as `from` and must come back to /auth/callback,
 * so nobody can sign a victim into the attacker's account (login CSRF).
 */
export function GET(request: Request) {
  const next = safeNext(new URL(request.url).searchParams.get("next"));
  const nonce = randomBytes(24).toString("hex");
  const opsapi = env().OPSAPI_PUBLIC_URL ?? env().OPSAPI_URL;
  const target = new URL("/auth/signin", opsapi);
  target.searchParams.set("frontend_url", new URL(env().APP_URL).origin);
  target.searchParams.set("from", nonce);

  const res = NextResponse.redirect(target, 303);
  res.cookies.set(SIGNIN_COOKIE, `${nonce}|${next}`, {
    httpOnly: true,
    secure: env().APP_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/auth",
    maxAge: 600,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
