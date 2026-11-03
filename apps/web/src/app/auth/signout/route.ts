import { NextResponse } from "next/server";
import { env } from "@/env";
import { SESSION_COOKIE } from "@/server/session";

/**
 * Ends the PintoPets session, then OpsAPI's single sign-on session, so the
 * next sign-in asks again. POST only (a link or image can't sign people out).
 */
export function POST() {
  const opsapi = env().OPSAPI_PUBLIC_URL ?? env().OPSAPI_URL;
  const target = new URL("/auth/signout", opsapi);
  target.searchParams.set("frontend_url", new URL(env().APP_URL).origin);
  const res = NextResponse.redirect(target, 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
