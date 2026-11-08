import { NextResponse } from "next/server";
import { env } from "@/env";
import { APP_SIGNIN_COOKIE, isChallenge } from "@/server/app-auth";
import { currentUser } from "@/server/auth";

/**
 * iOS app sign-in, step 1 (see server/app-auth.ts). Keeps the app's PKCE
 * challenge for 10 minutes, then runs the normal web sign-in (skipped when this
 * browser is already signed in), which returns to /auth/app/finish.
 */
export async function GET(request: Request) {
  const challenge = new URL(request.url).searchParams.get("challenge");
  const appUrl = env().APP_URL;
  if (!isChallenge(challenge)) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "This sign-in link isn't valid." } },
      { status: 400 },
    );
  }
  const target = (await currentUser())
    ? "/auth/app/finish"
    : `/auth/signin?next=${encodeURIComponent("/auth/app/finish")}`;
  const res = NextResponse.redirect(new URL(target, appUrl), 303);
  res.cookies.set(APP_SIGNIN_COOKIE, challenge, {
    httpOnly: true,
    secure: appUrl.startsWith("https://"),
    sameSite: "lax",
    path: "/auth/app",
    maxAge: 600,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
