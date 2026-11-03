import { expect, test } from "@playwright/test";

// API tests don't depend on screen size; run them once.
test.describe("API v1", () => {
  test.skip(({ isMobile }) => isMobile, "API tests run on one project only");

  test("health reports OpsAPI as ok", async ({ request }) => {
    const res = await request.get("/api/v1/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: "ok", checks: { opsapi: "ok" } });
  });

  test("lists all 17 species in order", async ({ request }) => {
    const res = await request.get("/api/v1/species");
    expect(res.ok()).toBe(true);
    const { data } = (await res.json()) as { data: { slug: string }[] };
    expect(data).toHaveLength(17);
    expect(data[0]?.slug).toBe("dog");
    expect(data.at(-1)?.slug).toBe("other");
  });

  test("lists breeds with Mixed / Unknown last", async ({ request }) => {
    const res = await request.get("/api/v1/species/dog/breeds");
    const { data } = (await res.json()) as { data: { name: string; isMixedOrUnknown: boolean }[] };
    expect(data.length).toBeGreaterThan(50);
    expect(data.map((b) => b.name)).toContain("Labrador Retriever");
    expect(data.at(-1)).toMatchObject({ name: "Mixed / Unknown", isMixedOrUnknown: true });
  });

  test("unknown species returns the standard error format", async ({ request }) => {
    const res = await request.get("/api/v1/species/dragon/breeds");
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "not_found", message: expect.any(String) },
    });
  });

  test("invalid input returns 422 with field details", async ({ request }) => {
    const res = await request.get("/api/v1/species/NOT_VALID!/breeds");
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.details[0].path).toEqual(["slug"]);
  });

  test("serves an OpenAPI 3.1 document", async ({ request }) => {
    const res = await request.get("/api/v1/openapi.json");
    const doc = await res.json();
    expect(doc.openapi).toBe("3.1.0");
    expect(Object.keys(doc.paths)).toContain("/api/v1/species/{slug}/breeds");
  });
});
