import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { parseServerEnv } = await import("./env");

const base = { OPSAPI_URL: "http://localhost:4042", OPSAPI_API_KEY: "opsk_test" };

describe("parseServerEnv", () => {
  it("accepts a minimal valid environment", () => {
    const env = parseServerEnv(base);
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.OPSAPI_NAMESPACE).toBe("pintopets");
    expect(env.NODE_ENV).toBe("development");
  });

  it("explains what is wrong without echoing secret values", () => {
    const bad = { ...base, OPSAPI_API_KEY: "secret-password-123" };
    expect(() => parseServerEnv(bad)).toThrow(/OPSAPI_API_KEY must be an OpsAPI key/);
    try {
      parseServerEnv(bad);
    } catch (e) {
      expect(String(e)).not.toContain("secret-password-123");
    }
  });

  it("requires a long session secret when one is set", () => {
    expect(() => parseServerEnv({ ...base, SESSION_SECRET: "short" })).toThrow(/SESSION_SECRET/);
  });

  it("refuses demo sign-in on prod", () => {
    expect(() => parseServerEnv({ ...base, APP_ENV: "prod", DEMO_AUTH: "true" })).toThrow(
      /DEMO_AUTH must never be enabled on prod/,
    );
  });

  it("allows demo sign-in on int", () => {
    expect(parseServerEnv({ ...base, APP_ENV: "int", DEMO_AUTH: "true" }).DEMO_AUTH).toBe(true);
  });
});
