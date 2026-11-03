import { describe, expect, it } from "vitest";
import {
  formatAge,
  formatDate,
  formatHands,
  formatPounds,
  formatWeight,
  parseHands,
  parsePounds,
  relativeDays,
  toGrams,
} from "./format";

describe("format", () => {
  it("dates", () => {
    expect(formatDate("2026-11-03")).toBe("3 Nov 2026");
    expect(formatDate(null)).toBe("");
  });

  it.each([
    ["2026-03-03", "8 months"],
    ["2026-10-20", "2 weeks"],
    ["2026-11-01", "2 days"],
    ["2024-09-03", "2 years 2 months"],
    ["2016-11-03", "10 years"],
    ["2026-10-04", "4 weeks"],
  ])("age from %s is %s", (dob, age) => {
    expect(formatAge(dob, "2026-11-03")).toBe(age);
  });

  it("age is null for missing or future dates", () => {
    expect(formatAge(null, "2026-11-03")).toBeNull();
    expect(formatAge("2027-01-01", "2026-11-03")).toBeNull();
  });

  it.each([
    [40, "40 g"],
    [850, "850 g"],
    [3450, "3.45 kg"],
    [25500, "25.5 kg"],
    [600000, "600 kg"],
  ])("weight %i g → %s", (g, s) => {
    expect(formatWeight(g)).toBe(s);
  });

  it("horse hands", () => {
    expect(formatHands(62)).toBe("15.2 hh");
    expect(parseHands("15.2")).toBe(62);
    expect(parseHands("16 hh")).toBe(64);
    expect(parseHands("15.5")).toBeNull(); // only .0–.3 exist in hands
    expect(parseHands("tall")).toBeNull();
  });

  it("money", () => {
    expect(parsePounds("£12.5")).toBe(1250);
    expect(parsePounds("80")).toBe(8000);
    expect(parsePounds("12.345")).toBeNull();
    expect(formatPounds(1250)).toBe("£12.50");
  });

  it("weight input", () => {
    expect(toGrams("25,5", "kg")).toBe(25500);
    expect(toGrams("850", "g")).toBe(850);
    expect(toGrams("-1", "kg")).toBeNull();
  });

  it("relative days", () => {
    expect(relativeDays(0)).toBe("today");
    expect(relativeDays(3)).toBe("in 3 days");
    expect(relativeDays(-2)).toBe("2 days ago");
  });
});
