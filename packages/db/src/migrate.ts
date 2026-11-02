import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./client";
import { loadDatabaseUrl } from "./env";

const { db, client } = createDb(loadDatabaseUrl(), { max: 1 });

try {
  await migrate(db, { migrationsFolder: new URL("../migrations", import.meta.url).pathname });
  console.info("Migrations applied.");
} finally {
  await client.end();
}
