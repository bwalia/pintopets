import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { parseServerEnv } = await import("./env");

describe("parseServerEnv", () => {
  it("accepts a minimal valid environment", () => {
    const env = parseServerEnv({ DATABASE_URL: "postgres://u:p@localhost:5432/db" });
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.NODE_ENV).toBe("development");
  });

  it("explains what is wrong without echoing secret values", () => {
    expect(() => parseServerEnv({ DATABASE_URL: "mysql://secret-password@host" })).toThrow(
      /DATABASE_URL must be a postgres/,
    );
    try {
      parseServerEnv({ DATABASE_URL: "mysql://secret-password@host" });
    } catch (e) {
      expect(String(e)).not.toContain("secret-password");
    }
  });

  it("refuses demo sign-in on prod", () => {
    expect(() =>
      parseServerEnv({
        DATABASE_URL: "postgres://u:p@localhost:5432/db",
        APP_ENV: "prod",
        DEMO_AUTH: "true",
      }),
    ).toThrow(/DEMO_AUTH must never be enabled on prod/);
  });

  it("allows demo sign-in on int", () => {
    const env = parseServerEnv({
      DATABASE_URL: "postgres://u:p@localhost:5432/db",
      APP_ENV: "int",
      DEMO_AUTH: "true",
    });
    expect(env.DEMO_AUTH).toBe(true);
  });
});
