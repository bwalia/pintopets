import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { decodeSession, encodeSession, safeNext } = await import("./session");

const secret = "a".repeat(40);
const user = { sub: "0b9e6c1e-1111-4222-8333-444455556666", email: "a@b.c", name: "Alex" };

describe("session cookie", () => {
  it("round-trips", () => {
    expect(decodeSession(encodeSession(user, secret), secret)).toEqual(user);
  });

  it("rejects tampering, the wrong secret and garbage", () => {
    const value = encodeSession(user, secret);
    const [data, mac] = value.split(".");
    const forged = Buffer.from(JSON.stringify({ ...user, sub: "someone-else", exp: 9e9 })).toString(
      "base64url",
    );
    expect(decodeSession(`${forged}.${mac}`, secret)).toBeNull();
    expect(decodeSession(`${data}.${mac}x`, secret)).toBeNull();
    expect(decodeSession(value, "b".repeat(40))).toBeNull();
    expect(decodeSession("nope", secret)).toBeNull();
    expect(decodeSession(undefined, secret)).toBeNull();
  });

  it("expires after 30 days", () => {
    const issued = Date.UTC(2026, 0, 1);
    const value = encodeSession(user, secret, issued);
    expect(decodeSession(value, secret, issued + 29 * 86_400_000)).toEqual(user);
    expect(decodeSession(value, secret, issued + 31 * 86_400_000)).toBeNull();
  });
});

describe("safeNext", () => {
  it.each([
    ["/pets/123", "/pets/123"],
    [null, "/"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
  ])("%s → %s", (input, out) => {
    expect(safeNext(input)).toBe(out);
  });
});
