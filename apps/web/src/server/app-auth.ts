import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { SESSION_DAYS, type SessionUser, signToken, verifyToken } from "./session";

/**
 * Sign-in for the PintoPets iOS app (OAuth 2.0 authorization code + PKCE, RFC 7636).
 *
 * 1. The app makes a random `verifier`, and opens /auth/app/start?challenge=S256(verifier)
 *    in ASWebAuthenticationSession.
 * 2. The person signs in as on the web (password, Google, 2FA), then confirms
 *    "Sign in to the app" on /auth/app/finish.
 * 3. PintoPets redirects to pintopets://auth/callback?code=… . The code is valid
 *    for 2 minutes and only together with the verifier, which never left the app,
 *    so another app catching the redirect can't use it.
 * 4. The app POSTs { code, verifier } to /api/v1/auth/token and gets a 30-day
 *    bearer token, kept in the iOS Keychain.
 */
export const APP_CALLBACK = "pintopets://auth/callback";
/** Holds the PKCE challenge while the person is signing in (10 minutes). */
export const APP_SIGNIN_COOKIE = "pp_app";
export const APP_CODE_SECONDS = 120;

/** base64url(SHA-256(verifier)): 43 characters. */
const CHALLENGE_RE = /^[A-Za-z0-9_-]{43}$/;
/** RFC 7636: 43–128 unreserved characters. */
const VERIFIER_RE = /^[A-Za-z0-9._~-]{43,128}$/;

export function isChallenge(value: string | null | undefined): value is string {
  return typeof value === "string" && CHALLENGE_RE.test(value);
}

export function challengeFor(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function mintAppCode(
  user: SessionUser,
  challenge: string,
  secret: string,
  now = Date.now(),
): string {
  return signToken(
    { ...user, chl: challenge, exp: Math.floor(now / 1000) + APP_CODE_SECONDS },
    secret,
    "app-code",
  );
}

type CodePayload = SessionUser & { chl: string; exp: number };

/** The user for a code + verifier pair, or null (expired, forged, wrong verifier). */
export function redeemAppCode(
  code: string,
  verifier: string,
  secret: string,
  now = Date.now(),
): SessionUser | null {
  if (!VERIFIER_RE.test(verifier)) return null;
  const p = verifyToken<CodePayload>(code, secret, "app-code", now);
  if (!p || typeof p.sub !== "string" || typeof p.chl !== "string") return null;
  const a = Buffer.from(challengeFor(verifier));
  const b = Buffer.from(p.chl);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { sub: p.sub, email: String(p.email ?? ""), name: String(p.name ?? "") };
}

export function issueAppToken(
  user: SessionUser,
  secret: string,
  now = Date.now(),
): { token: string; expiresAt: string } {
  const exp = Math.floor(now / 1000) + SESSION_DAYS * 86_400;
  return {
    token: signToken({ ...user, exp }, secret, "app-session"),
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

/** The user for an `Authorization: Bearer …` header value, or null. */
export function verifyAppToken(
  header: string | null | undefined,
  secret: string,
  now = Date.now(),
): SessionUser | null {
  const m = /^Bearer\s+(\S+)$/i.exec(header ?? "");
  if (!m) return null;
  const p = verifyToken<SessionUser & { exp: number }>(m[1], secret, "app-session", now);
  if (!p || typeof p.sub !== "string") return null;
  return { sub: p.sub, email: String(p.email ?? ""), name: String(p.name ?? "") };
}
