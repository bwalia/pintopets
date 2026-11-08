import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { APP_CALLBACK, APP_SIGNIN_COOKIE, isChallenge, mintAppCode } from "@/server/app-auth";
import { currentUser } from "@/server/auth";
import { assertSameOrigin, HttpError } from "@/server/http";

/**
 * iOS app sign-in, step 3: the person pressed "Sign in to the app". POST only
 * and same-origin, so a link alone can never hand a code to an app.
 */
export async function POST(request: Request) {
  const appUrl = env().APP_URL;
  try {
    assertSameOrigin(request);
  } catch (error) {
    if (error instanceof HttpError) return new NextResponse(error.message, { status: 403 });
    throw error;
  }
  const jar = await cookies();
  const challenge = jar.get(APP_SIGNIN_COOKIE)?.value;
  jar.delete({ name: APP_SIGNIN_COOKIE, path: "/auth/app" });
  const user = await currentUser();
  const secret = env().SESSION_SECRET;
  if (!isChallenge(challenge) || !user || !secret) {
    return NextResponse.redirect(new URL("/auth/app/finish?expired=1", appUrl), 303);
  }
  const code = mintAppCode(
    {
      sub: user.id,
      email: user.email,
      name: user.displayName === user.email ? "" : user.displayName,
    },
    challenge,
    secret,
  );
  const res = NextResponse.redirect(`${APP_CALLBACK}?code=${encodeURIComponent(code)}`, 303);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
