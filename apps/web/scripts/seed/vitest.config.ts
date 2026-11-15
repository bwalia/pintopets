import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Runs the demo-data seed (`pnpm seed:demo`) through the app's own services,
 * so seeded data passes the same validation, permissions and image processing
 * as anything a person adds. Not part of `pnpm test`.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) },
  },
  test: {
    root: fileURLToPath(new URL("../..", import.meta.url)),
    include: [process.env.SEED_FILE ?? "scripts/seed/seed-demo.ts"],
    environment: "node",
    setupFiles: ["./src/test-setup.ts"],
    testTimeout: 10 * 60_000,
  },
});
