import { describe, expect, it } from "vitest";
import { deriveReminders, type DueItem } from "./reminder-rules";

const base = { petId: "p1", petName: "Max", kind: "vaccination" as const, title: "Booster due" };
const item = (over: Partial<DueItem>): DueItem => ({
  ...base,
  recordId: "r",
  series: "Lepto",
  doneOn: "2026-01-01",
  dueOn: null,
  ...over,
});

describe("deriveReminders", () => {
  const today = "2026-11-03";

  it("classifies overdue, due soon and upcoming", () => {
    const out = deriveReminders(
      [
        item({ recordId: "a", series: "A", dueOn: "2026-10-30" }),
        item({ recordId: "b", series: "B", dueOn: "2026-11-10" }),
        item({ recordId: "c", series: "C", dueOn: "2027-01-15" }),
      ],
      today,
    );
    expect(out.map((r) => [r.recordId, r.state, r.daysUntil])).toEqual([
      ["a", "overdue", -4],
      ["b", "due_soon", 7],
      ["c", "upcoming", 73],
    ]);
  });

  it("only reminds from the latest entry of a series", () => {
    const out = deriveReminders(
      [
        item({ recordId: "old", doneOn: "2025-11-01", dueOn: "2026-11-01" }),
        item({ recordId: "new", doneOn: "2026-11-02", dueOn: "2027-11-02" }),
      ],
      today,
    );
    // The new booster's due date is beyond the 90-day window, so nothing shows,
    // and the old (now superseded) due date is not reported as overdue.
    expect(out).toEqual([]);
  });

  it("treats series names case-insensitively", () => {
    const out = deriveReminders(
      [
        item({ recordId: "old", series: "Rabies", doneOn: "2025-01-01", dueOn: "2026-01-01" }),
        item({ recordId: "new", series: "rabies ", doneOn: "2026-10-01", dueOn: "2026-11-20" }),
      ],
      today,
    );
    expect(out.map((r) => r.recordId)).toEqual(["new"]);
  });

  it("drops items far outside the window and items with no due date", () => {
    const out = deriveReminders(
      [
        item({ recordId: "ancient", series: "X", dueOn: "2025-01-01" }),
        item({ recordId: "far", series: "Y", dueOn: "2028-01-01" }),
        item({ recordId: "none", series: "Z", dueOn: null }),
      ],
      today,
    );
    expect(out).toEqual([]);
  });

  it("keeps pets separate", () => {
    const out = deriveReminders(
      [
        item({ recordId: "max", dueOn: "2026-11-05" }),
        item({ recordId: "bella", petId: "p2", petName: "Bella", dueOn: "2026-11-05" }),
      ],
      today,
    );
    expect(out.map((r) => r.petName)).toEqual(["Bella", "Max"]);
  });
});
