import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

/** App Review needs these pages without signing in, and linked from every page. */
test.describe("privacy, terms and support", () => {
  for (const [path, heading] of [
    ["/privacy", "Privacy Policy"],
    ["/terms", "Terms of Use"],
    ["/support", "Support"],
  ] as const) {
    test(`${path} is public, accessible and shows the contact email`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(
        page.getByRole("main").getByRole("link", { name: "support@pintopets.app" }).first(),
      ).toBeVisible();
      await expectNoA11yViolations(page);
    });
  }

  test("the footer links to them", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("navigation", { name: "Legal and help" });
    for (const name of ["Privacy", "Terms", "Support"]) {
      await expect(footer.getByRole("link", { name })).toBeVisible();
    }
  });

  test("the demo account can't be deleted", async ({ page }) => {
    await page.goto("/account");
    await page.getByRole("link", { name: "Delete account" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Delete your account" }),
    ).toBeVisible();
    await expect(page.getByText(/shared demo account, which can't be deleted/)).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Type DELETE/ })).toHaveCount(0);
    await expectNoA11yViolations(page);
  });
});
