import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

/**
 * Community forum on the shared demo account (a moderator in local and CI via
 * MODERATOR_EMAILS). Each run uses a unique title so runs don't collide.
 */
test.describe("community forum", () => {
  test("start a discussion, reply, mark the answer, search, lock", async ({ page }) => {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const title = `Rabbit not eating hay since yesterday ${id}`;

    await page.goto("/community");
    await expect(page.getByRole("heading", { level: 1, name: "Community" })).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole("link", { name: "Start a discussion" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Start a discussion" })).toBeVisible();
    await page
      .getByRole("combobox", { name: /^Topic/ })
      .selectOption({ label: "Health and symptoms" });
    await page.getByLabel("Kind of animal").selectOption({ label: "Rabbit" });
    await page.getByLabel("Your question or topic").fill(title);

    // Safety rule: contact details are refused, with the reason shown.
    await page
      .getByLabel("Details")
      .fill("She has stopped eating hay. Call me on 07700 900123 if you know why.");
    await page.getByRole("button", { name: "Post discussion" }).click();
    await expect(page.getByText(/don't share phone numbers/).first()).toBeVisible();

    await page
      .getByLabel("Details")
      .fill(
        `She is 3 years old and stopped eating hay yesterday. Droppings are smaller than usual. (${id})`,
      );
    await page.getByLabel("Tags (optional)").fill("rabbit, appetite");
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Post discussion" }).click();

    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText("#appetite")).toBeVisible();
    // Health topics always show urgent-help guidance.
    await expect(page.getByText("If your pet seems very unwell right now")).toBeVisible();
    // Your own post: no voting for yourself.
    await expect(page.getByRole("button", { name: /Helpful/ }).first()).toBeDisabled();

    await page
      .getByLabel("Your reply")
      .fill(`Reduced appetite in rabbits can be urgent. Please call a vet today. (${id})`);
    await page.getByRole("button", { name: "Post reply" }).click();
    await expect(page.getByRole("heading", { name: "1 reply" })).toBeVisible();

    await page.getByRole("button", { name: "Mark as answer" }).click();
    await expect(page.getByText("Marked as the answer")).toBeVisible();

    // Edit the question.
    await page.getByRole("button", { name: "Edit" }).first().click();
    await page
      .getByLabel("Message")
      .fill("Update: the vet says it was a tooth problem. Thanks all.");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Update: the vet says it was a tooth problem.")).toBeVisible();
    await expectNoA11yViolations(page);

    // Moderator: lock the discussion; replies close.
    const tools = page.getByRole("group", { name: "Moderator tools" }).first();
    await tools.getByRole("button", { name: "Lock" }).click();
    await expect(page.getByText("This discussion is locked.")).toBeVisible();

    // Search finds it, marked as answered.
    await page.goto(`/community?q=${id}`);
    const card = page.getByRole("article").filter({ hasText: title });
    await expect(card).toBeVisible();
    await expect(card.getByText("Answered")).toBeVisible();
    await expect(card.getByText("1 reply")).toBeVisible();

    await page.goto("/moderation");
    await expect(page.getByRole("heading", { level: 1, name: "Moderation" })).toBeVisible();
    await expect(page.getByText(/locked a thread/).first()).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("guidelines explain the rules", async ({ page }) => {
    await page.goto("/community/guidelines");
    await expect(
      page.getByRole("heading", { level: 1, name: "Community guidelines" }),
    ).toBeVisible();
    await expect(page.getByText("No selling")).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("the forum API is public to read and closed to anonymous writes", async ({ request }) => {
    const list = await request.get("/api/v1/community/threads?sort=top");
    expect(list.status()).toBe(200);
    expect(await list.json()).toMatchObject({ data: expect.any(Array), meta: { page: 1 } });

    const bad = await request.get("/api/v1/community/threads?category=not-a-topic");
    expect(bad.status()).toBe(422);
  });
});
