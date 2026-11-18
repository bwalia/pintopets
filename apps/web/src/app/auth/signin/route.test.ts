import { beforeEach, describe, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({ apple: false }));
vi.mock("@/env", () => ({
  env: () => ({
    APP_URL: "https://pets.example",
    OPSAPI_URL: "http://opsapi.internal",
    OPSAPI_PUBLIC_URL: "https://opsapi.example",
    APPLE_SIGNIN_ENABLED: settings.apple,
  }),
}));

const { GET } = await import("./route");

const signin = (query = "") => GET(new Request(`https://pets.example/auth/signin${query}`));

function location(res: Response): URL {
  return new URL(res.headers.get("location") ?? "about:blank");
}

function nonceCookie(res: Response): string {
  const cookie = res.headers.get("set-cookie") ?? "";
  return decodeURIComponent(/pp_signin=([^;]+)/.exec(cookie)?.[1] ?? "");
}

describe("GET /auth/signin", () => {
  beforeEach(() => {
    settings.apple = false;
  });

  it("goes straight to OpsAPI's hosted page when Apple is off", () => {
    const res = signin("?next=/pets");
    const target = location(res);
    expect(target.origin + target.pathname).toBe("https://opsapi.example/auth/signin");
    expect(target.searchParams.get("frontend_url")).toBe("https://pets.example");
    const [nonce, next] = nonceCookie(res).split("|");
    expect(target.searchParams.get("from")).toBe(nonce);
    expect(next).toBe("/pets");
  });

  it("ignores provider=apple when Apple is off", () => {
    const target = location(signin("?provider=apple"));
    expect(target.pathname).toBe("/auth/signin");
  });

  it("shows the chooser first when Apple is on", () => {
    settings.apple = true;
    const res = signin("?next=/auth/app/finish");
    expect(res.headers.get("location")).toBe(
      "https://pets.example/signin?next=%2Fauth%2Fapp%2Ffinish",
    );
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("starts Sign in with Apple at OpsAPI with a login-CSRF nonce", () => {
    settings.apple = true;
    const res = signin("?provider=apple&next=/reminders");
    const target = location(res);
    expect(target.origin + target.pathname).toBe("https://opsapi.example/auth/apple");
    const [nonce, next] = nonceCookie(res).split("|");
    expect(nonce).toMatch(/^[0-9a-f]{48}$/);
    expect(target.searchParams.get("from")).toBe(nonce);
    expect(next).toBe("/reminders");
  });

  it("keeps Google/email on the hosted page when Apple is on", () => {
    settings.apple = true;
    const target = location(signin("?provider=opsapi"));
    expect(target.pathname).toBe("/auth/signin");
  });

  it("never redirects to another site after sign-in", () => {
    settings.apple = true;
    const res = signin("?provider=apple&next=https://evil.example/");
    expect(nonceCookie(res).split("|")[1]).toBe("/");
  });

  it("a deliberate re-sign-in to delete the account forces OpsAPI's form and is flagged", () => {
    const res = signin("?reauth=1&next=/account/delete");
    const target = location(res);
    expect(target.pathname).toBe("/auth/signin");
    expect(target.searchParams.get("prompt")).toBe("login");
    expect(nonceCookie(res).split("|").slice(1)).toEqual(["/account/delete", "reauth"]);
  });

  it("reauth only applies to the delete page", () => {
    const res = signin("?reauth=1&next=/pets");
    expect(location(res).searchParams.get("prompt")).toBeNull();
    expect(nonceCookie(res).split("|")).toHaveLength(2);
  });

  it("keeps reauth through the chooser when Apple is on", () => {
    settings.apple = true;
    const res = signin("?reauth=1&next=/account/delete");
    const target = location(res);
    expect(target.pathname).toBe("/signin");
    expect(target.searchParams.get("reauth")).toBe("1");
  });
});
