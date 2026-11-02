import { describe, expect, it } from "vitest";
import { MICROCHIP_MANUFACTURER_CODES, SPECIES, slugify } from "./index";

describe("species seed data", () => {
  it("covers every species named in the brief", () => {
    expect(SPECIES.map((s) => s.slug)).toEqual([
      "dog",
      "cat",
      "horse",
      "rabbit",
      "guinea-pig",
      "hamster",
      "rat-mouse",
      "ferret",
      "bird",
      "reptile",
      "amphibian",
      "fish",
      "poultry",
      "goat",
      "sheep",
      "pig",
      "other",
    ]);
  });

  it("has unique species slugs", () => {
    const slugs = SPECIES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(SPECIES.map((s) => [s.slug, s] as const))(
    "%s has unique breed slugs and no hand-written Mixed/Unknown",
    (_slug, s) => {
      const slugs = s.breeds.map(slugify);
      expect(new Set(slugs).size).toBe(slugs.length);
      expect(slugs).not.toContain("mixed-unknown");
      expect(slugs.every((x) => x.length > 0)).toBe(true);
    },
  );

  it("only horses track height in hands; only Other needs free text", () => {
    expect(SPECIES.filter((s) => s.tracksHeightInHands).map((s) => s.slug)).toEqual(["horse"]);
    expect(SPECIES.filter((s) => s.requiresFreeText).map((s) => s.slug)).toEqual(["other"]);
  });
});

describe("slugify", () => {
  it.each([
    ["Labrador Retriever", "labrador-retriever"],
    ["Poodle (Toy)", "poodle-toy"],
    ["Hermann's Tortoise", "hermanns-tortoise"],
    ["Mixed / Unknown", "mixed-unknown"],
    ["Royal (Ball) Python", "royal-ball-python"],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("microchip manufacturer codes", () => {
  it("are unique and inside the ICAR range 900–998 (999 is test-only)", () => {
    const codes = MICROCHIP_MANUFACTURER_CODES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toBeGreaterThanOrEqual(900);
      expect(code).toBeLessThanOrEqual(998);
    }
  });
});
