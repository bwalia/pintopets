import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { REAUTH_NEXT } from "@/server/account/reauth";
import { safeNext, SIGNIN_COOKIE } from "@/server/session";

/**
 * Starts sign-in. OpsAPI is the identity provider for every method:
 *
 * - `?provider=apple` → OpsAPI's Sign in with Apple (/auth/apple)
 * - `?provider=opsapi` → OpsAPI's hosted page (password + 2FA, or Google; Google
 *   only while Apple is on, see App Store guideline 4.8 below)
 * - no provider → the /signin chooser when Apple is enabled, else the hosted page
 *
 * The hosted page also offers "Create an account" (`signup=1`): OpsAPI shows it
 * only for hosts in its HOSTED_SIGNUP_HOSTS, emails a code and activates the
 * account only once it is entered, so an unverified account never signs in here.
 * Not on the re-sign-in before deleting an account.
 *
 * `?reauth=1` (with next=/account/delete): a deliberate fresh sign-in to delete
 * the account. OpsAPI is asked to show its form even if the user is already
 * signed in there (`prompt=login`), so its token has a fresh `auth_time`, and
 * /auth/callback keeps that token briefly (server/account/reauth.ts).
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
  const reauth = params.get("reauth") === "1" && next === REAUTH_NEXT;

  if (apple && provider !== "apple" && provider !== "opsapi") {
    const chooser = NextResponse.redirect(
      new URL(
        `/signin?next=${encodeURIComponent(next)}${reauth ? "&reauth=1" : ""}`,
        env().APP_URL,
      ),
      303,
    );
    chooser.headers.set("Cache-Control", "no-store");
    return chooser;
  }

  const nonce = randomBytes(24).toString("hex");
  const opsapi = env().OPSAPI_PUBLIC_URL ?? env().OPSAPI_URL;
  const hosted = !(apple && provider === "apple");
  const target = new URL(hosted ? "/auth/signin" : "/auth/apple", opsapi);
  target.searchParams.set("frontend_url", new URL(env().APP_URL).origin);
  target.searchParams.set("from", nonce);
  if (reauth) target.searchParams.set("prompt", "login");
  else if (hosted) target.searchParams.set("signup", "1");
  // App Store guideline 4.8: an iOS app that offers Google sign-in must also offer
  // Sign in with Apple. Until Apple is set up, ask OpsAPI for its password-only page
  // (its other apps keep Google); turning Apple on brings Google back with it.
  if (!apple) target.searchParams.set("providers", "password");

  const res = NextResponse.redirect(target, 303);
  res.cookies.set(SIGNIN_COOKIE, `${nonce}|${next}${reauth ? "|reauth" : ""}`, {
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
