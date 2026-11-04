import { Secret, TOTP } from "otpauth";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { newRecoveryCodes, newSecret, normaliseRecoveryCode, otpauthUri, verifyCode } =
  await import("./totp");
const { decryptSecret, encryptSecret } = await import("./crypto");

const codeAt = (secret: string, t: number) =>
  new TOTP({
    secret: Secret.fromBase32(secret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  }).generate({ timestamp: t });

describe("TOTP", () => {
  const secret = newSecret();
  const now = Date.UTC(2026, 10, 4, 12, 0, 0);

  it("accepts the current code and one step of drift, not more", () => {
    expect(verifyCode(secret, codeAt(secret, now), now)).toBe(true);
    expect(verifyCode(secret, codeAt(secret, now - 30_000), now)).toBe(true);
    expect(verifyCode(secret, codeAt(secret, now - 120_000), now)).toBe(false);
  });

  it("rejects malformed codes and accepts spaces", () => {
    const code = codeAt(secret, now);
    expect(verifyCode(secret, `${code.slice(0, 3)} ${code.slice(3)}`, now)).toBe(true);
    expect(verifyCode(secret, "abcdef", now)).toBe(false);
    expect(verifyCode(secret, "12345", now)).toBe(false);
  });

  it("builds an authenticator URI with the PintoPets issuer", () => {
    expect(otpauthUri(secret, "a@b.c")).toMatch(
      /^otpauth:\/\/totp\/PintoPets:a%40b\.c\?.*issuer=PintoPets/,
    );
  });

  it("makes 10 distinct, readable recovery codes", () => {
    const codes = newRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect(normaliseRecoveryCode(" K7XQ M2PD ")).toBe("k7xq-m2pd");
  });
});

describe("secret encryption", () => {
  const key = Buffer.alloc(32, 7).toString("base64");

  it("round-trips and never stores plaintext", () => {
    const sealed = encryptSecret("JBSWY3DPEHPK3PXP", key);
    expect(sealed).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(sealed, key)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("detects tampering and the wrong key", () => {
    const sealed = encryptSecret("secret", key);
    const parts = sealed.split(".");
    const bytes = Buffer.from(parts[3] ?? "", "base64url");
    bytes[0] = (bytes[0] ?? 0) ^ 0xff;
    const flipped = [parts[0], parts[1], parts[2], bytes.toString("base64url")].join(".");
    expect(() => decryptSecret(flipped, key)).toThrow();
    expect(() => decryptSecret(sealed, Buffer.alloc(32, 9).toString("base64"))).toThrow();
  });
});
