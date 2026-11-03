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

export function encodeSession(user: SessionUser, secret: string, now = Date.now()): string {
  const payload: Payload = { ...user, exp: Math.floor(now / 1000) + SESSION_DAYS * 86_400 };
  const data = b64(JSON.stringify(payload));
  return `${data}.${b64(sign(secret, data))}`;
}

export function decodeSession(
  value: string | undefined,
  secret: string,
  now = Date.now(),
): SessionUser | null {
  if (!value) return null;
  const [data, mac] = value.split(".");
  if (!data || !mac) return null;
  const expected = sign(secret, data);
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Partial<Payload>;
    if (typeof p.sub !== "string" || typeof p.exp !== "number" || p.exp * 1000 < now) return null;
    return { sub: p.sub, email: String(p.email ?? ""), name: String(p.name ?? "") };
  } catch {
    return null;
  }
}

/** Only same-site relative paths, so `next` can't send people elsewhere. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  return next.slice(0, 512);
}
