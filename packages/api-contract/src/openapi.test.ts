import { describe, expect, it } from "vitest";
import { generateOpenApiDocument } from "./openapi";

describe("OpenAPI document", () => {
  const doc = generateOpenApiDocument({ serverUrl: "http://localhost:3000", version: "test" });

  it("is OpenAPI 3.1", () => {
    expect(doc.openapi).toBe("3.1.0");
  });

  it("documents the v1 routes", () => {
    const paths = Object.keys(doc.paths ?? {});
    expect(paths).toEqual(
      expect.arrayContaining([
        "/api/v1/health",
        "/api/v1/species",
        "/api/v1/species/{slug}/breeds",
        "/api/v1/me",
        "/api/v1/pets",
        "/api/v1/pets/{petId}",
        "/api/v1/pets/{petId}/photos",
        "/api/v1/reminders",
        "/api/v1/pets/{petId}/records/vaccinations",
        "/api/v1/pets/{petId}/records/medications/{recordId}",
      ]),
    );
  });

  it("has unique operation ids (used to name generated Swift/Kotlin methods)", () => {
    const ids = Object.values(doc.paths ?? {}).flatMap((item) =>
      Object.values(item ?? {})
        .map((op: unknown) => (op as { operationId?: string }).operationId)
        .filter((x): x is string => Boolean(x)),
    );
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("registers the shared error schema", () => {
    expect(doc.components?.schemas?.ApiError).toBeDefined();
  });
});
