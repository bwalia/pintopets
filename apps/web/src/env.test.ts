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
});
