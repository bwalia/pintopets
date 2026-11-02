import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const { apiRoute, HttpError, parseInput } = await import("./http");
const Sentry = await import("@sentry/nextjs");

const req = new Request("http://localhost/api/v1/test");

describe("apiRoute", () => {
  it("passes successful responses through", async () => {
    const handler = apiRoute(async () => Response.json({ ok: true }));
    const res = await handler(req, {});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("turns HttpError into the standard error envelope", async () => {
    const handler = apiRoute(async () => {
      throw new HttpError("not_found", "Pet not found");
    });
    const res = await handler(req, {});
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "not_found", message: "Pet not found" } });
  });

  it("hides unexpected errors and reports them to Sentry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = apiRoute(async () => {
      throw new Error("db password is hunter2");
    });
    const res = await handler(req, {});
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error.code).toBe("internal_error");
    expect(JSON.stringify(body)).not.toContain("hunter2");
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});

describe("parseInput", () => {
  it("returns parsed data", () => {
    expect(parseInput(z.object({ n: z.coerce.number() }), { n: "3" })).toEqual({ n: 3 });
  });

  it("throws a 422 validation error with field paths", () => {
    try {
      parseInput(z.object({ slug: z.string().min(2) }), { slug: "" });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(HttpError);
      const err = e as InstanceType<typeof HttpError>;
      expect(err.code).toBe("validation_failed");
      expect(err.details).toEqual([{ path: ["slug"], message: expect.any(String) }]);
    }
  });
});
