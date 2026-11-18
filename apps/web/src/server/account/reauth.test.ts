import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { closeOpsapiIdentity, openReauth, sealReauth } = await import("./reauth");

const SECRET = "s".repeat(40);
const ME = "11111111-1111-4111-8111-111111111111";

describe("fresh sign-in token for account deletion", () => {
  it("round-trips for the same user and is not readable in the cookie", () => {
    const sealed = sealReauth(ME, "eyJ.secret.jwt", SECRET);
    expect(sealed).not.toContain("eyJ");
    expect(openReauth(sealed, ME, SECRET)).toBe("eyJ.secret.jwt");
  });

  it("is refused for another user, another secret, after 10 minutes, or when tampered", () => {
    const now = Date.now();
    const sealed = sealReauth(ME, "t", SECRET, now);
    expect(openReauth(sealed, "22222222-2222-4222-8222-222222222222", SECRET, now)).toBeNull();
    expect(openReauth(sealed, ME, "x".repeat(40), now)).toBeNull();
    expect(openReauth(sealed, ME, SECRET, now + 10 * 60_000 + 1000)).toBeNull();
    const [iv = "", tag = "", body = ""] = sealed.split(".");
    const flipped = body.startsWith("A") ? `B${body.slice(1)}` : `A${body.slice(1)}`;
    expect(openReauth(`${iv}.${tag}.${flipped}`, ME, SECRET, now)).toBeNull();
    expect(openReauth(undefined, ME, SECRET)).toBeNull();
    expect(openReauth("garbage", ME, SECRET)).toBeNull();
  });
});

describe("closing the OpsAPI identity", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(status: number, body: unknown = {}) {
    const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status }));
    vi.stubGlobal("fetch", fetch);
    return fetch;
  }
  const reason = (p: Promise<unknown>) =>
    p.then(
      () => "ok",
      (e: { code?: string; details?: { reason?: string } }) => `${e.code}:${e.details?.reason}`,
    );

  it("posts to /auth/delete-account with the user's own token and reports Apple revocation", async () => {
    const fetch = stubFetch(200, { message: "ok", apple_revoked: true });
    expect(await closeOpsapiIdentity("http://opsapi.internal", "jwt")).toEqual({
      appleRevoked: true,
    });
    const [url, init] = fetch.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("http://opsapi.internal/auth/delete-account");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer jwt");
  });

  it("no Apple sign-in on file reads as null", async () => {
    stubFetch(200, { message: "ok", apple_revoked: null });
    expect(await closeOpsapiIdentity("http://o", "jwt")).toEqual({ appleRevoked: null });
  });

  it("a stale token asks them to sign in again", async () => {
    stubFetch(403, { code: "reauth_required" });
    expect(await reason(closeOpsapiIdentity("http://o", "jwt"))).toBe(
      "step_up_required:recent_sign_in_required",
    );
  });

  it("an OpsAPI failure or outage is retryable, not silent", async () => {
    stubFetch(500);
    expect(await reason(closeOpsapiIdentity("http://o", "jwt"))).toBe(
      "service_unavailable:identity_not_closed",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    expect(await reason(closeOpsapiIdentity("http://o", "jwt"))).toBe(
      "service_unavailable:identity_not_closed",
    );
  });
});
