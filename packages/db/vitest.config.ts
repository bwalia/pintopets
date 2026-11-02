import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Integration tests touch a real database and must not run in parallel.
    fileParallelism: false,
    setupFiles: ["./src/test-setup.ts"],
  },
});
