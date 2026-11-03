import { describe, expect, it } from "vitest";
import {
  camelToSnake,
  detailsToIssues,
  fromRow,
  pgTimestampToIso,
  snakeToCamel,
  toBody,
} from "./mapping";

describe("OpsAPI mapping", () => {
  it("converts key case both ways", () => {
    expect(snakeToCamel("dose_as_prescribed")).toBe("doseAsPrescribed");
    expect(camelToSnake("weightGrams")).toBe("weight_grams");
    expect(camelToSnake(snakeToCamel("date_of_birth_is_estimate"))).toBe(
      "date_of_birth_is_estimate",
    );
  });

  it.each([
    ["2026-11-03 22:52:04.846313+00", "2026-11-03T22:52:04.846Z"],
    ["2026-11-02 08:30:00+00", "2026-11-02T08:30:00.000Z"],
    ["2026-11-02 09:30:00+01", "2026-11-02T08:30:00.000Z"],
    ["2026-11-02T08:30:00Z", "2026-11-02T08:30:00.000Z"],
  ])("parses Postgres timestamp %s", (input, iso) => {
    expect(pgTimestampToIso(input)).toBe(iso);
  });

  it("rejects garbage timestamps loudly", () => {
    expect(() => pgTimestampToIso("not a date")).toThrow();
  });

  it("maps a row to a DTO", () => {
    expect(
      fromRow({
        id: 7,
        namespace_id: 3,
        uuid: "u-1",
        pet_uuid: "p-1",
        created_by_user_uuid: "user-1",
        occurred_at: "2026-11-02 08:30:00+00",
        created_at: "2026-11-03 22:52:04.846313+00",
        updated_at: "2026-11-03 22:52:04.846313+00",
        symptom: "Sick",
        weight_grams: 25000,
        notes: null,
      }),
    ).toEqual({
      id: "u-1",
      petId: "p-1",
      createdByUserUuid: "user-1",
      occurredAt: "2026-11-02T08:30:00.000Z",
      createdAt: "2026-11-03T22:52:04.846Z",
      updatedAt: "2026-11-03T22:52:04.846Z",
      symptom: "Sick",
      weightGrams: 25000,
      notes: null,
    });
  });

  it("maps a DTO to a body, dropping undefined but keeping null", () => {
    expect(toBody({ petId: "p", weightGrams: 1, notes: null, skip: undefined })).toEqual({
      pet_uuid: "p",
      weight_grams: 1,
      notes: null,
    });
  });

  it("maps validation details to field issues", () => {
    expect(
      detailsToIssues({ weight_grams: "must be at least 1", pet_uuid: "is required" }),
    ).toEqual([
      { path: ["weightGrams"], message: "Must be at least 1" },
      { path: ["petId"], message: "Is required" },
    ]);
  });
});
