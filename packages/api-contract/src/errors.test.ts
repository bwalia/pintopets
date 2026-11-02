import { z } from "zod";
import { describe, expect, it } from "vitest";
import { ApiError, ERROR_CODES, ERROR_STATUS, toValidationIssues } from "./errors";

describe("errors", () => {
  it("maps every error code to an HTTP status", () => {
    for (const code of ERROR_CODES) {
      expect(ERROR_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
  });

  it("parses the standard error envelope", () => {
    const parsed = ApiError.parse({ error: { code: "not_found", message: "Pet not found" } });
    expect(parsed.error.code).toBe("not_found");
  });

  it("turns zod errors into path/message issues", () => {
    const result = z.object({ name: z.string().min(1) }).safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toValidationIssues(result.error)).toEqual([
        { path: ["name"], message: expect.any(String) },
      ]);
    }
  });
});
