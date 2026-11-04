import "server-only";
import QRCode from "qrcode";
import { env } from "@/env";
import type { Actor } from "../auth";
import { HttpError } from "../http";
import { createRow, listPage, updateRow } from "../opsapi/client";
import type { OpsRow } from "../opsapi/mapping";
import { pgTimestampToIso } from "../opsapi/mapping";
import { decryptSecret, encryptSecret, sameString, sha256 } from "./crypto";
import { newRecoveryCodes, newSecret, normaliseRecoveryCode, otpauthUri, verifyCode } from "./totp";

/**
 * Authenticator-app 2FA for every PintoPets user, however they signed in
 * (OpsAPI password + emailed code, or Google). State lives in the plugin's
 * account-settings resource; the TOTP secret is encrypted with a key only
 * PintoPets holds, and recovery codes are stored as SHA-256 hashes.
 */
export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

export interface SecurityStatus {
  totpEnabled: boolean;
  enabledAt: string | null;
  requireCodeAtSignIn: boolean;
  recoveryCodesLeft: number;
  lockedUntil: string | null;
  consentAiLearning: boolean;
  consentMarketing: boolean;
}

function key(): string {
  const k = env().TOTP_ENCRYPTION_KEY;
  if (!k)
    throw new HttpError("service_unavailable", "Two-factor sign-in isn't set up on this site yet.");
  return k;
}

async function settings(userId: string): Promise<OpsRow> {
  const [row] = await listPage("account-settings", { user_uuid: userId, per_page: 1 });
  if (row) return row;
  try {
    return await createRow("account-settings", { userUuid: userId });
  } catch (error) {
    // Two first requests at once: the unique index lets one win; read it back.
    const [again] = await listPage("account-settings", { user_uuid: userId, per_page: 1 });
    if (again) return again;
    throw error;
  }
}

const codesOf = (row: OpsRow): string[] =>
  Array.isArray(row.recovery_codes) ? (row.recovery_codes as string[]) : [];
const enabled = (row: OpsRow) =>
  typeof row.totp_enabled_at === "string" && typeof row.totp_secret_enc === "string";
const ts = (v: unknown) => (typeof v === "string" && v ? pgTimestampToIso(v) : null);

export async function securityStatus(actor: Pick<Actor, "id">): Promise<SecurityStatus> {
  const row = await settings(actor.id);
  const locked = ts(row.locked_until);
  return {
    totpEnabled: enabled(row),
    enabledAt: ts(row.totp_enabled_at),
    requireCodeAtSignIn: row.require_code_at_sign_in === true,
    recoveryCodesLeft: codesOf(row).length,
    lockedUntil: locked && Date.parse(locked) > Date.now() ? locked : null,
    consentAiLearning: row.consent_ai_learning === true,
    consentMarketing: row.consent_marketing === true,
  };
}

/** Step 1: a new secret (not active until confirmed with a code from the app). */
export async function startEnrolment(actor: Pick<Actor, "id" | "email">) {
  const row = await settings(actor.id);
  if (enabled(row)) throw new HttpError("conflict", "Two-factor sign-in is already on.");
  const secret = newSecret();
  await updateRow("account-settings", row.uuid, {
    totpSecretEnc: encryptSecret(secret, key()),
    totpEnabledAt: null,
  });
  const uri = otpauthUri(secret, actor.email || actor.id);
  return { secret, uri, qrSvg: await QRCode.toString(uri, { type: "svg", margin: 1, width: 220 }) };
}

/** Step 2: the first code turns 2FA on and returns recovery codes (shown once). */
export async function confirmEnrolment(actor: Pick<Actor, "id">, code: string): Promise<string[]> {
  const row = await settings(actor.id);
  if (enabled(row)) throw new HttpError("conflict", "Two-factor sign-in is already on.");
  if (typeof row.totp_secret_enc !== "string")
    throw new HttpError("bad_request", "Start setting up two-factor sign-in first.");
  if (!verifyCode(decryptSecret(row.totp_secret_enc, key()), code)) {
    throw new HttpError(
      "validation_failed",
      "That code didn't match. Check your app and try again.",
      [{ path: ["code"], message: "Code didn't match" }],
    );
  }
  const codes = newRecoveryCodes();
  await updateRow("account-settings", row.uuid, {
    totpEnabledAt: new Date().toISOString(),
    recoveryCodes: codes.map(sha256),
    failedAttempts: 0,
    lockedUntil: null,
  });
  return codes;
}

/**
 * Checks a TOTP or recovery code. Five wrong codes lock checks for 15 minutes.
 * A recovery code works once.
 */
export async function verifySecondFactor(actor: Pick<Actor, "id">, input: string): Promise<void> {
  const row = await settings(actor.id);
  if (!enabled(row)) {
    throw new HttpError(
      "forbidden",
      "Turn on two-factor sign-in (Account → Security) to do this.",
      { reason: "totp_required" },
    );
  }
  const locked = ts(row.locked_until);
  if (locked && Date.parse(locked) > Date.now()) {
    throw new HttpError(
      "rate_limited",
      `Too many wrong codes. Try again after ${new Date(locked).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" })}.`,
    );
  }

  const secret = decryptSecret(String(row.totp_secret_enc), key());
  if (verifyCode(secret, input)) {
    if (Number(row.failed_attempts) > 0)
      await updateRow("account-settings", row.uuid, { failedAttempts: 0, lockedUntil: null });
    return;
  }
  const hashes = codesOf(row);
  const hashed = sha256(normaliseRecoveryCode(input));
  const match = hashes.find((h) => sameString(h, hashed));
  if (match) {
    await updateRow("account-settings", row.uuid, {
      recoveryCodes: hashes.filter((h) => h !== match),
      failedAttempts: 0,
      lockedUntil: null,
    });
    return;
  }

  const attempts = Number(row.failed_attempts ?? 0) + 1;
  const lock = attempts >= MAX_ATTEMPTS;
  await updateRow("account-settings", row.uuid, {
    failedAttempts: lock ? 0 : attempts,
    lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
  });
  throw new HttpError(
    lock ? "rate_limited" : "validation_failed",
    lock
      ? `Too many wrong codes. Try again in ${LOCK_MINUTES} minutes.`
      : "That code didn't match.",
    lock
      ? undefined
      : [{ path: ["code"], message: `Code didn't match (${MAX_ATTEMPTS - attempts} tries left)` }],
  );
}

/** Turning 2FA off needs a valid code (and a fresh step-up, checked by the caller). */
export async function disableTotp(actor: Pick<Actor, "id">): Promise<void> {
  const row = await settings(actor.id);
  await updateRow("account-settings", row.uuid, {
    totpSecretEnc: null,
    totpEnabledAt: null,
    recoveryCodes: [],
    requireCodeAtSignIn: false,
    failedAttempts: 0,
    lockedUntil: null,
  });
}

export async function regenerateRecoveryCodes(actor: Pick<Actor, "id">): Promise<string[]> {
  const row = await settings(actor.id);
  if (!enabled(row)) throw new HttpError("forbidden", "Turn on two-factor sign-in first.");
  const codes = newRecoveryCodes();
  await updateRow("account-settings", row.uuid, { recoveryCodes: codes.map(sha256) });
  return codes;
}

export async function updatePreferences(
  actor: Pick<Actor, "id">,
  prefs: { requireCodeAtSignIn?: boolean; consentAiLearning?: boolean; consentMarketing?: boolean },
): Promise<SecurityStatus> {
  const row = await settings(actor.id);
  if (prefs.requireCodeAtSignIn && !enabled(row))
    throw new HttpError("forbidden", "Turn on two-factor sign-in first.");
  const now = new Date().toISOString();
  await updateRow("account-settings", row.uuid, {
    ...(prefs.requireCodeAtSignIn !== undefined
      ? { requireCodeAtSignIn: prefs.requireCodeAtSignIn }
      : {}),
    ...(prefs.consentAiLearning !== undefined
      ? { consentAiLearning: prefs.consentAiLearning, consentAiLearningAt: now }
      : {}),
    ...(prefs.consentMarketing !== undefined
      ? { consentMarketing: prefs.consentMarketing, consentMarketingAt: now }
      : {}),
  });
  return securityStatus(actor);
}

/** Whether sign-in must ask for a code (used by /auth/callback). */
export async function codeRequiredAtSignIn(userId: string): Promise<boolean> {
  const row = await settings(userId);
  return enabled(row) && row.require_code_at_sign_in === true;
}
