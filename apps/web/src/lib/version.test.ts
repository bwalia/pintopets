import { afterEach, describe, expect, it, vi } from "vitest";
import { appEnv, appVersion } from "./version";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("appVersion", () => {
  it("prefers APP_VERSION, set by the Helm chart to the image tag", () => {
    vi.stubEnv("APP_VERSION", "abc1234");
    expect(appVersion()).toBe("abc1234");
  });

  it("is read at call time, not baked in at build time", () => {
    vi.stubEnv("APP_VERSION", "one1111");
    expect(appVersion()).toBe("one1111");
    vi.stubEnv("APP_VERSION", "two2222");
    expect(appVersion()).toBe("two2222");
  });
});

describe("appEnv", () => {
  it.each(["int", "test", "acc", "prod"] as const)("recognises %s", (ring) => {
    vi.stubEnv("APP_ENV", ring);
    expect(appEnv()).toBe(ring);
  });

  it("falls back to local for anything else", () => {
    vi.stubEnv("APP_ENV", "staging");
    expect(appEnv()).toBe("local");
  });
});
