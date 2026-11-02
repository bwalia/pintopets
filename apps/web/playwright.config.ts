import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Never hang a CI run (or a local one) indefinitely.
  globalTimeout: 10 * 60_000,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    locale: "en-GB",
    timezoneId: "Europe/London",
  },
  // Phone first (section 8), then desktop.
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // CI runs against the production build; locally the dev server is fine.
    // Call the Next binary directly: a pnpm wrapper doesn't pass on SIGTERM,
    // which left the server running and hung teardown.
    command: process.env.CI
      ? "./node_modules/.bin/next start --port 3000"
      : "./node_modules/.bin/next dev --port 3000",
    url: `${baseURL}/api/v1/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
  },
});
