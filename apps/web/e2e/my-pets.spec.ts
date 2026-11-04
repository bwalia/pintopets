import { expect, type Page, test } from "@playwright/test";
import sharp from "sharp";
import { expectNoA11yViolations } from "./a11y";

/**
 * My Pets end to end (demo sign-in). The demo account is shared by every
 * test, so each test uses a unique pet name.
 */
const unique = (base: string) =>
  `${base} ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

async function addPet(page: Page, name: string, opts: { weight?: string } = {}) {
  await page.goto("/pets/new");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Species").selectOption({ label: "Dog" });
  await page.getByLabel("Breed", { exact: true }).selectOption({ label: "Labrador Retriever" });
  await page.getByLabel("Sex").selectOption("male");
  await page.getByLabel("Date of birth", { exact: true }).fill(isoDaysFromToday(-240));
  if (opts.weight) await page.getByLabel("Current weight (kg)").fill(opts.weight);
  await page.getByRole("button", { name: "Add pet" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page).toHaveURL(/\/pets\/[0-9a-f-]{36}$/);
  return page.url();
}

test.describe("My Pets", () => {
  test("add a pet, then see it in My Pets with its age and breed", async ({ page }) => {
    const name = unique("Max");
    await addPet(page, name, { weight: "24" });
    await expect(page.getByText("Dog · Labrador Retriever")).toBeVisible();
    await expect(page.getByText(/^7 months$|^8 months$/)).toBeVisible();
    await expect(page.getByText(/Demo mode/)).toBeVisible();

    await page.getByRole("link", { name: "My Pets" }).first().click();
    await expect(page.getByRole("link", { name })).toBeVisible();
  });

  test("weight history: add weigh-ins and see the chart and table", async ({ page }) => {
    const url = await addPet(page, unique("Weighed"), { weight: "24" });
    await page.goto(`${url}/weight`);
    await expect(page.getByText("Add at least two weigh-ins")).toBeVisible();

    await page.getByRole("button", { name: "Add weight" }).click();
    const dialog = page.getByRole("dialog", { name: "Add weight" });
    await dialog.getByLabel("Date").fill(isoDaysFromToday(-30));
    await dialog.getByLabel("Weight").fill("22.5");
    await dialog.getByRole("button", { name: "Add weight" }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByRole("img", { name: /Weight from/ })).toBeVisible();
    await page.getByText("Show as table").click();
    await expect(page.getByRole("table").getByText("22.5 kg")).toBeVisible();
    await expect(page.getByRole("table").getByText("24 kg")).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("health records: vaccination with a due date shows on Reminders", async ({ page }) => {
    const name = unique("Booster");
    const url = await addPet(page, name);
    await page.goto(`${url}/health`);

    await page.getByRole("button", { name: "Add vaccination" }).click();
    const dialog = page.getByRole("dialog", { name: "Add vaccination" });
    await dialog.getByLabel("Vaccine").fill("Leptospirosis");
    await dialog.getByLabel("Next due").fill(isoDaysFromToday(10));
    await dialog.getByRole("button", { name: "Add vaccination" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Leptospirosis", { exact: true })).toBeVisible();

    await page.goto("/reminders");
    const reminder = page.getByRole("link", { name: `${name}: Leptospirosis vaccination due` });
    await expect(reminder).toBeVisible();
    await expect(page.getByText("in 10 days").first()).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("medicine form records the vet's dose and requires it", async ({ page }) => {
    const url = await addPet(page, unique("Meds"));
    await page.goto(`${url}/health`);
    await page.getByRole("button", { name: "Add medicine" }).click();
    const dialog = page.getByRole("dialog", { name: "Add medicine" });
    await expect(dialog.getByText(/Never change a dose without asking your vet/)).toBeVisible();
    await dialog.getByLabel("Medicine").fill("Antibiotic");
    await dialog.getByLabel("How often").fill("Twice a day");
    await dialog.getByRole("button", { name: "Add medicine" }).click();
    await expect(dialog.getByText("Copy the dose exactly as your vet wrote it")).toBeVisible();
    // What the owner already typed is kept after a validation error.
    await expect(dialog.getByLabel("Medicine")).toHaveValue("Antibiotic");
    await expect(dialog.getByLabel("How often")).toHaveValue("Twice a day");
    await dialog.getByLabel("Dose (as written by your vet)").fill("1 tablet, as on the label");
    await dialog.getByRole("button", { name: "Add medicine" }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByText("1 tablet, as on the label · Twice a day", { exact: false }),
    ).toBeVisible();
  });

  test("symptom diary: log a symptom, then see it on the overview", async ({ page }) => {
    const url = await addPet(page, unique("Sick"));
    await page.goto(`${url}/health`);
    await page.getByRole("button", { name: "Add symptom" }).click();
    const dialog = page.getByRole("dialog", { name: "Add symptom" });
    await dialog.getByLabel("What happened").fill("Sick straight after eating");
    await dialog.getByLabel("How bad").selectOption("moderate");
    await dialog.getByRole("button", { name: "Add symptom" }).click();
    await expect(dialog).toBeHidden();
    await page.goto(url);
    await expect(page.getByText("Sick straight after eating")).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("photos: upload with a description; it becomes the profile photo", async ({ page }) => {
    const url = await addPet(page, unique("Photo"));
    await page.goto(`${url}/photos`);
    const png = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#c87a3c" },
    })
      .png()
      .toBuffer();
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "dog.png", mimeType: "image/png", buffer: png });
    const dialog = page.getByRole("dialog", { name: "Add photo" });
    await dialog.getByLabel("Describe the photo").fill("A brown dog in the garden");
    await dialog.getByRole("button", { name: "Upload" }).click();
    await expect(dialog).toBeHidden();

    const thumb = page.getByRole("img", { name: "A brown dog in the garden" });
    await expect(thumb).toBeVisible();
    const tile = page.getByRole("listitem").filter({ has: thumb });
    await expect(tile.getByText("Profile", { exact: true })).toBeVisible();
    // The image is served privately as WebP.
    const src = await thumb.getAttribute("src");
    const res = await page.request.get(src ?? "");
    expect(res.headers()["content-type"]).toBe("image/webp");
    expect(res.headers()["cache-control"]).toContain("private");
  });

  test("health summary is printable", async ({ page }) => {
    const name = unique("Summary");
    const url = await addPet(page, name, { weight: "30" });
    await page.goto(`${url}/summary`);
    await expect(page.getByRole("heading", { name: `Health summary: ${name}` })).toBeVisible();
    await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();
    await expect(page.getByText("30 kg").first()).toBeVisible();
  });

  test("archive and restore", async ({ page }) => {
    const name = unique("Rehomed");
    const url = await addPet(page, name);
    await page.goto(`${url}/profile`);
    await page.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByText("Archived", { exact: true })).toBeVisible();
    await page.goto("/pets");
    await expect(page.getByRole("link", { name })).toHaveCount(0);
    await page.goto("/pets?status=archived");
    await expect(page.getByRole("link", { name })).toBeVisible();
    await page.goto(`${url}/profile`);
    await page.getByRole("button", { name: "Restore to My Pets" }).click();
    await expect(page.getByText("Archived", { exact: true })).toHaveCount(0);
  });

  test("memorial mode is gentle and read-only", async ({ page }) => {
    const name = unique("Remembered");
    const url = await addPet(page, name);
    await page.goto(`${url}/profile`);
    await page.getByRole("button", { name: `${name} has passed away` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Keep their memory" }).click();
    await expect(page.getByText(`In loving memory of ${name}`)).toBeVisible();
    await page.goto(`${url}/health`);
    await expect(page.getByRole("button", { name: /^Add/ })).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test("validation: a pet needs a name and species", async ({ page }) => {
    await page.goto("/pets/new");
    await page.getByRole("button", { name: "Add pet" }).click();
    await expect(page.locator("form").getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/pets\/new$/);
    await expectNoA11yViolations(page);
  });

  test("unknown pets are a 404", async ({ page }) => {
    const res = await page.goto("/pets/00000000-0000-7000-8000-000000000000");
    expect(res?.status()).toBe(404);
  });
});

test.describe("My Pets API", () => {
  test.skip(({ isMobile }) => isMobile, "API tests run on one project only");

  test("create, list and read records through /api/v1", async ({ request }) => {
    const created = await request.post("/api/v1/pets", {
      data: { name: unique("Api"), speciesSlug: "cat", breedSlugs: ["ragdoll"] },
    });
    expect(created.status()).toBe(201);
    const pet = (await created.json()).data;
    expect(pet).toMatchObject({ myRole: "owner", species: { slug: "cat" } });

    const weight = await request.post(`/api/v1/pets/${pet.id}/records/weights`, {
      data: { measuredOn: isoDaysFromToday(0), weightGrams: 4200 },
    });
    expect(weight.status()).toBe(201);
    const list = await request.get(`/api/v1/pets/${pet.id}/records/weights`);
    expect((await list.json()).data[0]).toMatchObject({ weightGrams: 4200 });

    const bad = await request.post(`/api/v1/pets/${pet.id}/records/medications`, {
      data: { name: "X" },
    });
    expect(bad.status()).toBe(422);
    expect((await bad.json()).error.code).toBe("validation_failed");
  });

  test("refuses cross-site writes", async ({ request }) => {
    const res = await request.post("/api/v1/pets", {
      headers: { origin: "https://evil.example" },
      data: { name: "x", speciesSlug: "dog" },
    });
    expect(res.status()).toBe(403);
  });

  test("rejects non-images disguised as photos", async ({ request }) => {
    const pet = (
      await (
        await request.post("/api/v1/pets", { data: { name: unique("Upload"), speciesSlug: "dog" } })
      ).json()
    ).data;
    const res = await request.post(`/api/v1/pets/${pet.id}/photos`, {
      multipart: {
        file: {
          name: "cat.png",
          mimeType: "image/png",
          buffer: Buffer.from("<svg onload=alert(1)>"),
        },
      },
    });
    expect(res.status()).toBe(415);
  });
});

test("long pet names never push buttons off the card on phones", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Phone layout");
  const name = `A very long pet name indeed ${Date.now().toString(36)}`;
  await page.goto("/pets/new");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Species").selectOption({ label: "Dog" });
  await page.getByRole("button", { name: "Add pet" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await page.goto(`${page.url()}/profile`);
  const viewport = page.viewportSize()?.width ?? 0;
  for (const label of [`${name} has passed away`, `Delete ${name}`]) {
    const box = await page.getByRole("button", { name: label }).boundingBox();
    expect(box && box.x + box.width).toBeLessThanOrEqual(viewport);
  }
});
