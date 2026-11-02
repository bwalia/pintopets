import { describe, expect, it } from "vitest";
import { uuidv7 } from "./uuid";

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuidv7", () => {
  it("has the version 7 layout", () => {
    expect(uuidv7()).toMatch(UUID_V7);
  });

  it("encodes the timestamp in the first 48 bits", () => {
    const ts = Date.UTC(2026, 10, 2, 12, 0, 0);
    const hex = uuidv7(ts).replace(/-/g, "").slice(0, 12);
    expect(parseInt(hex, 16)).toBe(ts);
  });

  it("sorts by creation time", () => {
    const a = uuidv7(1_000);
    const b = uuidv7(2_000);
    expect(a < b).toBe(true);
  });
});
