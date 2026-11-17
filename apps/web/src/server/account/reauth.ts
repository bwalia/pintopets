import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { HttpError } from "../http";

/**
 * Re-authentication for deleting the account.
 *
 * Deleting a PintoPets account also closes the user's OpsAPI (Workstation)
 * identity and revokes Sign in with Apple (App Store guideline 5.1.1(v)).
 * OpsAPI only allows that with the user's own token from a sign-in in the last
 * 10 minutes (`auth_time`). So "Sign in again to continue" sends them through
 * OpsAPI's hosted page with `prompt=login` (no silent single sign-on), and
 * /auth/callback keeps that one fresh token here: AES-256-GCM encrypted,
 * HttpOnly, 10 minutes, bound to the user. It is used only by DELETE
 * /api/v1/me, then cleared. Every other sign-in still discards the token.
 */
export const REAUTH_COOKIE = "pp_reauth";
export const REAUTH_MINUTES = 10;
/** The return path that asks /auth/callback to keep the token. */
export const REAUTH_NEXT = "/account/delete";

interface Reauth {
  sub: string;
  token: string;
  exp: number;
}

const key = (secret: string) => createHash("sha256").update(`reauth:${secret}`).digest();

export function sealReauth(sub: string, token: string, secret: string, now = Date.now()): string {
  const payload: Reauth = { sub, token, exp: Math.floor(now / 1000) + REAUTH_MINUTES * 60 };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(Buffer.from(REAUTH_COOKIE));
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

/** The fresh OpsAPI token for `sub`, or null (missing, tampered, expired or someone else's). */
export function openReauth(
  value: string | undefined,
  sub: string,
  secret: string,
  now = Date.now(),
): string | null {
  if (!value) return null;
  const [iv, tag, body] = value.split(".").map((p) => Buffer.from(p ?? "", "base64url"));
  if (!iv || iv.length !== 12 || !tag || tag.length !== 16 || !body) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(secret), iv);
    decipher.setAAD(Buffer.from(REAUTH_COOKIE));
    decipher.setAuthTag(tag);
    const p = JSON.parse(
      Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8"),
    ) as Partial<Reauth>;
    if (p.sub !== sub || typeof p.token !== "string" || typeof p.exp !== "number") return null;
    if (p.exp * 1000 < now) return null;
    return p.token;
  } catch {
    return null;
  }
}

export interface IdentityClosed {
  /** true: Apple access revoked; false: Apple user but revocation failed; null: not an Apple sign-in. */
  appleRevoked: boolean | null;
}

/**
 * Closes the user's OpsAPI identity: POST /auth/delete-account with their own
 * fresh token. OpsAPI deactivates the sign-in, ends its sessions and revokes
 * Sign in with Apple. A 403 means the token is no longer fresh: sign in again.
 */
export async function closeOpsapiIdentity(
  opsapiUrl: string,
  token: string,
): Promise<IdentityClosed> {
  let res: Response;
  try {
    res = await fetch(new URL("/auth/delete-account", opsapiUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    throw new HttpError(
      "service_unavailable",
      "Your PintoPets data is deleted, but we couldn't reach Workstation to close your sign-in. Please try again.",
      { reason: "identity_not_closed" },
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new HttpError(
      "step_up_required",
      "Your PintoPets data is deleted. Please sign in again to finish closing your account.",
      { reason: "recent_sign_in_required" },
    );
  }
  if (!res.ok) {
    throw new HttpError(
      "service_unavailable",
      "Your PintoPets data is deleted, but we couldn't close your Workstation sign-in. Please try again.",
      { reason: "identity_not_closed", status: res.status },
    );
  }
  const body = (await res.json().catch(() => null)) as { apple_revoked?: unknown } | null;
  const apple = body?.apple_revoked;
  return { appleRevoked: typeof apple === "boolean" ? apple : null };
}
