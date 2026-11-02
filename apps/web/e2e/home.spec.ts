import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

test.describe("home page", () => {
  test("shows the worry box and urgent help", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "What's worrying you about your pet?" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Describe what's happening" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Find an emergency vet/ })).toHaveAttribute(
      "href",
      /findavet\.rcvs\.org\.uk/,
    );
    await expect(page.getByText(/not a diagnosis/)).toBeVisible();
  });

  test("asking a question carries it to the Ask page", async ({ page }) => {
    await page.goto("/");
    const question = "Why is my 8 month old dog sick straight after eating?";
    await page.getByRole("textbox", { name: "Describe what's happening" }).fill(question);
    await page.getByRole("button", { name: "Ask" }).click();
    await expect(page).toHaveURL(/\/ask\?q=/);
    await expect(page.getByText(question)).toBeVisible();
    // Even before the AI exists, urgent help is shown on the Ask page.
    await expect(page.getByRole("link", { name: /Find an emergency vet/ })).toBeVisible();
  });

  test("has no accessibility violations", async ({ page }) => {
    await page.goto("/");
    await expectNoA11yViolations(page);
  });

  test("sends security headers", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});
