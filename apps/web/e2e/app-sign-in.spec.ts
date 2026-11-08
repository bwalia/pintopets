import { createHash, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

/**
 * iOS app sign-in (authorization code + PKCE), driven like the app's browser
 * sheet: start → confirm → pintopets://auth/callback?code=… → token → API.
 */
test("the iOS app signs in with a one-time code and its PKCE verifier", async ({
  page,
  request,
  baseURL,
}) => {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  let callback = "";
  page.on("request", (r) => {
    if (r.url().startsWith("pintopets://")) callback = r.url();
  });
  await page.goto(`/auth/app/start?challenge=${challenge}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Sign in to the PintoPets app" }),
  ).toBeVisible();
  await expectNoA11yViolations(page);

  // The browser can't open the custom scheme; read the redirect instead.
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/auth/app/approve")),
    page.getByRole("button", { name: "Sign in to the app" }).click(),
  ]);
  expect(response.status()).toBe(303);
  callback ||= response.headers()["location"] ?? "";
  const code = new URL(callback).searchParams.get("code") ?? "";
  expect(callback).toMatch(/^pintopets:\/\/auth\/callback\?code=/);

  const wrong = await request.post("/api/v1/auth/token", {
    data: { code, verifier: randomBytes(32).toString("base64url") },
  });
  expect(wrong.status()).toBe(401);

  const ok = await request.post("/api/v1/auth/token", { data: { code, verifier } });
  expect(ok.status()).toBe(200);
  const { token } = (await ok.json()).data;

  const me = await request.get("/api/v1/me", { headers: { Authorization: `Bearer ${token}` } });
  expect(me.status()).toBe(200);
  expect((await me.json()).data).toMatchObject({ email: "demo@pintopets.app" });

  const bad = await request.get("/api/v1/me", { headers: { Authorization: "Bearer nope" } });
  expect(bad.status()).toBe(401);

  // Approving needs a same-site POST, so a link can't hand a code to an app.
  const cross = await request.post(`${baseURL}/auth/app/approve`, {
    headers: { Origin: "https://evil.example" },
    maxRedirects: 0,
  });
  expect(cross.status()).toBe(403);
});
