import { randomInt } from "node:crypto";
import { Secret, TOTP } from "otpauth";

/**
 * TOTP (RFC 6238, SHA-1, 6 digits, 30 s): works with Google Authenticator,
 * Microsoft Authenticator, Authy, 1Password and any other authenticator app.
 */
export const ISSUER = "PintoPets";

export function newSecret(): string {
  return new Secret({ size: 20 }).base32;
}

function totp(secret: string, label: string) {
  return new TOTP({
    issuer: ISSUER,
    label,
    secret: Secret.fromBase32(secret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });
}

export function otpauthUri(secret: string, label: string): string {
  return totp(secret, label).toString();
}

/** True if `code` is valid now (±1 step for clock drift). */
export function verifyCode(secret: string, code: string, now = Date.now()): boolean {
  const clean = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  return totp(secret, ISSUER).validate({ token: clean, timestamp: now, window: 1 }) !== null;
}

/** Ten one-time recovery codes like "k7xq-m2pd" (no ambiguous characters). */
export function newRecoveryCodes(count = 10): string[] {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const part = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return Array.from({ length: count }, () => `${part()}-${part()}`);
}

export function normaliseRecoveryCode(code: string): string {
  return code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/^(.{4})(.{4})$/, "$1-$2");
}
