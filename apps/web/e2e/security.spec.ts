import { expect, test } from "@playwright/test";
import { Secret, TOTP } from "otpauth";
import { expectNoA11yViolations } from "./a11y";

/**
 * Two-factor sign-in end to end on the shared demo account: set up with a real
 * authenticator code, use it for sensitive actions, then turn it off again.
 * Runs on one project only (it changes account-wide state).
 */
test.describe("account security", () => {
  test.skip(({ isMobile }) => isMobile, "Account-wide state: one project only");
  test.describe.configure({ mode: "serial" });

  test("set up 2FA, export data, delete a pet, turn 2FA off", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Two-factor sign-in" })).toBeVisible();
    await expectNoA11yViolations(page);

    // Leftover state from an interrupted run can't be cleaned without its secret.
    test.skip(
      await page.getByText("On", { exact: true }).isVisible(),
      "2FA already on for the demo account",
    );

    await page.getByRole("button", { name: "Set up two-factor sign-in" }).click();
    const setup = page.getByRole("dialog", { name: "Set up two-factor sign-in" });
    await expect(
      setup.getByRole("img", { name: "QR code for your authenticator app" }),
    ).toBeVisible();
    await setup.getByText("Can't scan? Enter this key").click();
    const secret = (await setup.locator("p.font-mono").textContent())?.trim() ?? "";
    const totp = new TOTP({ secret: Secret.fromBase32(secret) });

    await setup.getByLabel("6-digit code").fill("000000");
    await setup.getByRole("button", { name: "Turn on" }).click();
    await expect(setup.getByText("Code didn't match")).toBeVisible();
    await setup.getByLabel("6-digit code").fill(totp.generate());
    await setup.getByRole("button", { name: "Turn on" }).click();

    const codes = page.getByRole("dialog", { name: "Your recovery codes" });
    await expect(
      codes.getByRole("list", { name: "Recovery codes" }).getByRole("listitem"),
    ).toHaveCount(10);
    await codes.getByRole("button", { name: "I've saved them" }).click();
    await expect(page.getByText("On", { exact: true })).toBeVisible();

    // Sensitive action right after setup: the fresh code counts as a step-up.
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export my data" }).click();
    expect((await download).suggestedFilename()).toMatch(
      /^pintopets-export-\d{4}-\d{2}-\d{2}\.json$/,
    );

    // Delete a pet permanently (type the name, step-up already fresh).
    const name = `Delete me ${Date.now().toString(36)}`;
    await page.goto("/pets/new");
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Species").selectOption({ label: "Cat" });
    await page.getByRole("button", { name: "Add pet" }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await page.goto(`${page.url()}/profile`);
    await page.getByRole("button", { name: `Delete ${name}` }).click();
    const confirm = page.getByRole("dialog", { name: `Delete ${name} permanently?` });
    await expect(confirm.getByRole("button", { name: "Delete permanently" })).toBeDisabled();
    await confirm.getByLabel(`Type ${name} to confirm`).fill(name);
    await confirm.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page).toHaveURL(/\/pets$/);
    await expect(page.getByRole("link", { name })).toHaveCount(0);

    // Turn it off again (still within the 10-minute step-up window).
    await page.goto("/account");
    await page.getByRole("button", { name: "Turn off" }).click();
    await expect(page.getByText("Off", { exact: true })).toBeVisible();
  });

  test("sensitive actions ask for a code (step-up) and explain 2FA when it's off", async ({
    page,
  }) => {
    await page.goto("/account");
    await page.getByRole("button", { name: "Export my data" }).click();
    const dialog = page.getByRole("dialog", { name: "Confirm it's you" });
    await dialog.getByLabel("Code").fill("123456");
    await dialog.getByRole("button", { name: "Confirm" }).click();
    await expect(dialog.getByText(/Turn on two-factor sign-in/)).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Set up two-factor sign-in" })).toBeVisible();
  });
});

test.describe("security API", () => {
  test.skip(({ isMobile }) => isMobile, "API tests run on one project only");

  test("export needs a recent authenticator code", async ({ request }) => {
    const res = await request.get("/api/v1/me/export");
    expect(res.status()).toBe(403);
    expect((await res.json()).error.code).toBe("step_up_required");
  });
});
