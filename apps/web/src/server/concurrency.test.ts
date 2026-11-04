import { describe, expect, it } from "vitest";
import { mapLimit } from "./concurrency";

describe("mapLimit", () => {
  it("keeps order and never exceeds the limit", async () => {
    let active = 0;
    let peak = 0;
    const out = await mapLimit([5, 1, 4, 2, 3, 6, 7], 3, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, n));
      active--;
      return n * 10;
    });
    expect(out).toEqual([50, 10, 40, 20, 30, 60, 70]);
    expect(peak).toBeLessThanOrEqual(3);
  });

  it("handles an empty list", async () => {
    expect(await mapLimit([], 4, async (x) => x)).toEqual([]);
  });
});
