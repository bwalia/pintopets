import { describe, expect, it } from "vitest";
import { generateOpenApiDocument } from "./openapi";

describe("OpenAPI document", () => {
  const doc = generateOpenApiDocument({ serverUrl: "http://localhost:3000", version: "test" });

  it("is OpenAPI 3.1", () => {
    expect(doc.openapi).toBe("3.1.0");
  });

  it("documents every v1 route", () => {
    expect(Object.keys(doc.paths ?? {}).sort()).toEqual([
      "/api/v1/health",
      "/api/v1/species",
      "/api/v1/species/{slug}/breeds",
    ]);
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
