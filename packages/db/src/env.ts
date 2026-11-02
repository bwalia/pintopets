import { config } from "dotenv";

/** Loads the repo-root env files for CLI scripts (migrate, seed, tests). */
export function loadDatabaseUrl(): string {
  config({ path: ["../../.env.local", "../../.env"], quiet: true });
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local first.");
  }
  return url;
}
