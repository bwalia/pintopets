import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * PintoPets' own session after an OpsAPI sign-in: a small HMAC-signed cookie
 * (OpsAPI user uuid, name, email, expiry). The OpsAPI token itself is never
 * stored: it is exchanged for the user once, at /auth/callback.
 */
export const SESSION_COOKIE = "pp_session";
/** Short-lived nonce + return path while the user is on OpsAPI's sign-in page. */
export const SIGNIN_COOKIE = "pp_signin";
export const SESSION_DAYS = 30;

export interface SessionUser {
  sub: string;
  email: string;
  name: string;
}

interface Payload extends SessionUser {
  exp: number;
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const sign = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest();

/**
 * Signed (not encrypted) token: base64url(JSON) "." base64url(HMAC-SHA256).
 * `purpose` is mixed into the MAC, so a token issued for one use (step-up,
 * pending sign-in, trusted device) can never be replayed as another (session).
 */
export function signToken(
  payload: Record<string, unknown>,
  secret: string,
  purpose: string,
): string {
  const data = b64(JSON.stringify(payload));
  return `${data}.${b64(sign(secret, `${purpose}:${data}`))}`;
}

export function verifyToken<T extends { exp: number }>(
  value: string | undefined,
  secret: string,
  purpose: string,
  now = Date.now(),
): T | null {
  if (!value) return null;
  const [data, mac] = value.split(".");
  if (!data || !mac) return null;
  const expected = sign(secret, `${purpose}:${data}`);
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as T;
    if (typeof p.exp !== "number" || p.exp * 1000 < now) return null;
    return p;
  } catch {
    return null;
  }
}

export function encodeSession(user: SessionUser, secret: string, now = Date.now()): string {
  const payload: Payload = { ...user, exp: Math.floor(now / 1000) + SESSION_DAYS * 86_400 };
  return signToken({ ...payload }, secret, "session");
}

export function decodeSession(
  value: string | undefined,
  secret: string,
  now = Date.now(),
): SessionUser | null {
  const p = verifyToken<Partial<Payload> & { exp: number }>(value, secret, "session", now);
  if (!p || typeof p.sub !== "string") return null;
  return { sub: p.sub, email: String(p.email ?? ""), name: String(p.name ?? "") };
}

/** A sign-in waiting for the authenticator code (/auth/verify), 10 minutes. */
export const PENDING_COOKIE = "pp_pending";
/** "Trust this device" after a code at sign-in: 30 days, per user. */
export const TRUSTED_COOKIE = "pp_trusted";

/** Only same-site relative paths, so `next` can't send people elsewhere. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  return next.slice(0, 512);
}
