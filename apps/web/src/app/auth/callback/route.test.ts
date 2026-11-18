import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const SECRET = "s".repeat(40);
const ME = "11111111-1111-4111-8111-111111111111";
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    delete: (opts: string | { name: string }) =>
      jar.delete(typeof opts === "string" ? opts : opts.name),
  }),
}));
vi.mock("@/env", () => ({
  env: () => ({
    APP_URL: "https://pets.example",
    OPSAPI_URL: "http://opsapi.internal",
    SESSION_SECRET: SECRET,
  }),
}));
const twoFactor = vi.hoisted(() => ({ on: false }));
vi.mock("@/server/security/service", () => ({
  codeRequiredAtSignIn: async () => twoFactor.on,
}));

const { GET } = await import("./route");
const { openReauth } = await import("@/server/account/reauth");

function callback(pending: string) {
  jar.set("pp_signin", pending);
  return GET(new Request("https://pets.example/auth/callback?token=fresh.jwt&redirect=n0nce"));
}
function cookie(res: Response, name: string): string | undefined {
  const all = res.headers.getSetCookie();
  const hit = all.find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1).split(";")[0] ?? "") : undefined;
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    jar.clear();
    twoFactor.on = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ user: { uuid: ME, email: "a@b.c", active: true } })),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("an ordinary sign-in never keeps the OpsAPI token", async () => {
    const res = await callback("n0nce|/account/delete");
    expect(cookie(res, "pp_session")).toBeTruthy();
    expect(cookie(res, "pp_reauth")).toBeUndefined();
  });

  it("a deliberate re-sign-in to delete the account keeps it, sealed, for that user", async () => {
    const res = await callback("n0nce|/account/delete|reauth");
    expect(new URL(res.headers.get("location") ?? "about:blank").pathname).toBe("/account/delete");
    const sealed = cookie(res, "pp_reauth");
    expect(sealed).toBeTruthy();
    expect(sealed).not.toContain("fresh.jwt");
    expect(openReauth(sealed, ME, SECRET)).toBe("fresh.jwt");
  });

  it("keeps it too when an authenticator code is still needed at sign-in", async () => {
    twoFactor.on = true;
    const res = await callback("n0nce|/account/delete|reauth");
    expect(new URL(res.headers.get("location") ?? "about:blank").pathname).toBe("/auth/verify");
    expect(openReauth(cookie(res, "pp_reauth"), ME, SECRET)).toBe("fresh.jwt");
  });

  it("the reauth flag means nothing for other pages", async () => {
    const res = await callback("n0nce|/pets|reauth");
    expect(cookie(res, "pp_reauth")).toBeUndefined();
  });
});
