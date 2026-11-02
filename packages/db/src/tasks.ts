/**
 * Database tasks for deployed environments. Bundled by `pnpm bundle` into a
 * single dist/db-tasks.mjs (with drizzle and postgres inlined) that runs in the
 * app image's init container before the web server starts:
 *
 *   node db-tasks.mjs migrate-and-seed
 *
 * Reads DATABASE_URL from the environment and migrations from MIGRATIONS_DIR
 * (default: ./migrations next to this file). Waits for the database to accept
 * connections first, since the init container can start before Postgres.
 */
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./client";
import { seedReferenceData } from "./seed/reference";

type Task = "migrate" | "seed" | "migrate-and-seed";
const TASKS: readonly Task[] = ["migrate", "seed", "migrate-and-seed"];

function isTask(value: string | undefined): value is Task {
  return TASKS.includes(value as Task);
}

async function waitForDatabase(run: () => Promise<unknown>, attempts = 60): Promise<void> {
  for (let i = 1; i <= attempts; i++) {
    try {
      await run();
      return;
    } catch (error) {
      if (i === attempts) throw error;
      const reason = error instanceof Error ? error.message : String(error);
      console.info(`Database not ready (${i}/${attempts}): ${reason}`);
      await sleep(2_000);
    }
  }
}

async function main(): Promise<void> {
  const task = process.argv[2];
  if (!isTask(task)) {
    console.error(`Usage: db-tasks <${TASKS.join("|")}>`);
    process.exit(2);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(2);
  }

  const migrationsFolder =
    process.env.MIGRATIONS_DIR ?? fileURLToPath(new URL("./migrations", import.meta.url));
  const { db, client } = createDb(url, { max: 1 });

  try {
    await waitForDatabase(() => client`select 1`);
    if (task === "migrate" || task === "migrate-and-seed") {
      await migrate(db, { migrationsFolder });
      console.info("Migrations applied.");
    }
    if (task === "seed" || task === "migrate-and-seed") {
      const counts = await seedReferenceData(db);
      console.info(
        `Seeded ${counts.species} species, ${counts.breeds} breeds, ${counts.manufacturerCodes} chip manufacturer codes.`,
      );
    }
  } finally {
    await client.end();
  }
}

await main();
