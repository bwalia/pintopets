import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { safeNext, SIGNIN_COOKIE } from "@/server/session";

/**
 * Starts sign-in. OpsAPI is the identity provider for every method:
 *
 * - `?provider=apple` → OpsAPI's Sign in with Apple (/auth/apple)
 * - `?provider=opsapi` → OpsAPI's hosted page (password + 2FA, or Google)
 * - no provider → the /signin chooser when Apple is enabled, else the hosted page
 *
 * A one-time nonce travels as `from` and must come back to /auth/callback,
 * so nobody can sign a victim into the attacker's account (login CSRF). Both
 * OpsAPI routes return to /auth/callback?token=…&redirect=<from>.
 */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const next = safeNext(params.get("next"));
  const provider = params.get("provider");
  const apple = env().APPLE_SIGNIN_ENABLED;

  if (apple && provider !== "apple" && provider !== "opsapi") {
    const chooser = NextResponse.redirect(
      new URL(`/signin?next=${encodeURIComponent(next)}`, env().APP_URL),
      303,
    );
    chooser.headers.set("Cache-Control", "no-store");
    return chooser;
  }

  const nonce = randomBytes(24).toString("hex");
  const opsapi = env().OPSAPI_PUBLIC_URL ?? env().OPSAPI_URL;
  const target = new URL(apple && provider === "apple" ? "/auth/apple" : "/auth/signin", opsapi);
  target.searchParams.set("frontend_url", new URL(env().APP_URL).origin);
  target.searchParams.set("from", nonce);

  const res = NextResponse.redirect(target, 303);
  res.cookies.set(SIGNIN_COOKIE, `${nonce}|${next}`, {
    httpOnly: true,
    secure: env().APP_URL.startsWith("https://"),
    // Lax still reaches /auth/callback: OpsAPI ends Apple's form_post with a
    // top-level GET redirect to it.
    sameSite: "lax",
    path: "/auth",
    maxAge: 600,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
