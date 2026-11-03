import { timingSafeEqual } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import {
  encodeSession,
  safeNext,
  SESSION_COOKIE,
  SESSION_DAYS,
  SIGNIN_COOKIE,
} from "@/server/session";

const Me = z.object({
  user: z.object({
    uuid: z.uuid(),
    email: z.string(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    active: z.boolean().nullish(),
  }),
});

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * OpsAPI's SSO contract: /auth/callback?token=<JWT>&redirect=<from>. The token
 * is exchanged once, server to server, for the user (GET /auth/me), then a
 * PintoPets session starts. The token is never stored or logged.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const appUrl = env().APP_URL;
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/?signin=${reason}`, appUrl), 303);
  const jar = await cookies();
  const pending = jar.get(SIGNIN_COOKIE)?.value ?? "";
  jar.delete({ name: SIGNIN_COOKIE, path: "/auth" });

  const [nonce = "", next] = pending.split("|");
  const token = url.searchParams.get("token") ?? "";
  if (!nonce || !token || !same(nonce, url.searchParams.get("redirect") ?? ""))
    return fail("expired");

  let me: z.infer<typeof Me>;
  try {
    const res = await fetch(new URL("/auth/me", env().OPSAPI_URL), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return fail("rejected");
    me = Me.parse(await res.json());
  } catch (error) {
    Sentry.captureException(error);
    return fail("unavailable");
  }
  if (me.user.active === false) return fail("inactive");

  const secret = env().SESSION_SECRET;
  if (!secret) return fail("disabled");
  const name = [me.user.first_name, me.user.last_name].filter(Boolean).join(" ").trim();
  const res = NextResponse.redirect(new URL(safeNext(next), appUrl), 303);
  res.cookies.set(
    SESSION_COOKIE,
    encodeSession({ sub: me.user.uuid, email: me.user.email, name }, secret),
    {
      httpOnly: true,
      secure: appUrl.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 86_400,
    },
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}
