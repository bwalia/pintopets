import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { challengeFor, isChallenge, issueAppToken, mintAppCode, redeemAppCode, verifyAppToken } =
  await import("./app-auth");
const { encodeSession } = await import("./session");

const secret = "s".repeat(40);
const user = { sub: "0b9e6c1e-1111-4222-8333-444455556666", email: "a@b.c", name: "Alex" };
const verifier = randomBytes(32).toString("base64url");
const challenge = challengeFor(verifier);

describe("app sign-in (PKCE)", () => {
  it("matches the RFC 7636 S256 example", () => {
    expect(challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
    expect(isChallenge(challenge)).toBe(true);
    expect(isChallenge("short")).toBe(false);
    expect(isChallenge(null)).toBe(false);
  });

  it("redeems a code only with its verifier, within 2 minutes", () => {
    const now = Date.UTC(2026, 10, 8);
    const code = mintAppCode(user, challenge, secret, now);
    expect(redeemAppCode(code, verifier, secret, now + 60_000)).toEqual(user);
    expect(redeemAppCode(code, randomBytes(32).toString("base64url"), secret, now)).toBeNull();
    expect(redeemAppCode(code, verifier, secret, now + 121_000)).toBeNull();
    expect(redeemAppCode(code, verifier, "x".repeat(40), now)).toBeNull();
    expect(redeemAppCode(code, "bad verifier!", secret, now)).toBeNull();
  });

  it("won't accept other tokens as a code or a bearer token", () => {
    const session = encodeSession(user, secret);
    expect(redeemAppCode(session, verifier, secret)).toBeNull();
    expect(verifyAppToken(`Bearer ${session}`, secret)).toBeNull();
    expect(verifyAppToken(`Bearer ${mintAppCode(user, challenge, secret)}`, secret)).toBeNull();
  });

  it("issues 30-day bearer tokens", () => {
    const now = Date.UTC(2026, 10, 8);
    const { token, expiresAt } = issueAppToken(user, secret, now);
    expect(expiresAt).toBe("2026-12-08T00:00:00.000Z");
    expect(verifyAppToken(`Bearer ${token}`, secret, now + 86_400_000)).toEqual(user);
    expect(verifyAppToken(`bearer ${token}`, secret, now)).toEqual(user);
    expect(verifyAppToken(`Bearer ${token}`, secret, now + 31 * 86_400_000)).toBeNull();
    expect(verifyAppToken(token, secret, now)).toBeNull();
    expect(verifyAppToken(undefined, secret, now)).toBeNull();
  });
});
