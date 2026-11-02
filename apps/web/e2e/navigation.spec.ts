import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

const SECTIONS = [
  { name: "My Pets", path: "/pets" },
  { name: "Ask AI", path: "/ask" },
  { name: "Community", path: "/community" },
  { name: "Reminders", path: "/reminders" },
] as const;

test.describe("navigation", () => {
  for (const { name, path } of SECTIONS) {
    test(`reaches ${name}`, async ({ page }) => {
      await page.goto("/");
      // Phones use the bottom tab bar, desktops the sidebar; both are "Main" navs.
      const nav = page.getByRole("navigation", { name: /^Main/ }).filter({ visible: true });
      await nav.getByRole("link", { name }).click();
      await expect(page).toHaveURL(path);
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await expect(nav.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    });
  }

  test("owners do not see professional or admin sections", async ({ page }) => {
    await page.goto("/");
    for (const name of ["Review Queue", "Knowledge Base", "Admin"]) {
      await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);
    }
  });

  test("skip link moves focus to the main content", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard navigation is a desktop concern");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });

  test("unknown pages show a friendly 404", async ({ page }) => {
    const res = await page.goto("/no-such-page");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  });

  test("placeholder pages have no accessibility violations", async ({ page }) => {
    for (const { path } of SECTIONS) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
  });
});
