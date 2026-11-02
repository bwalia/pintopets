import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "../client";
import { breeds, microchipManufacturerCodes, species } from "../schema";
import { SPECIES } from "./data";
import { seedReferenceData } from "./reference";

/**
 * Runs against a real, migrated database (local Docker or CI service).
 * Skipped when DATABASE_URL is not set so unit tests still run anywhere.
 */
const url = process.env.DATABASE_URL;

describe.skipIf(!url)("seedReferenceData (integration)", () => {
  const { db, client } = createDb(url ?? "", { max: 1 });

  beforeAll(async () => {
    await seedReferenceData(db);
  });
  afterAll(async () => {
    await client.end();
  });

  it("is idempotent: a second run creates no duplicates", async () => {
    const before = await db.select({ n: count() }).from(breeds);
    await seedReferenceData(db);
    const after = await db.select({ n: count() }).from(breeds);
    expect(after[0]?.n).toBe(before[0]?.n);
  });

  it("gives every species a Mixed / Unknown breed", async () => {
    const rows = await db
      .select({ slug: species.slug })
      .from(breeds)
      .innerJoin(species, eq(breeds.speciesId, species.id))
      .where(eq(breeds.isMixedOrUnknown, true));
    expect(rows.map((r) => r.slug).sort()).toEqual(SPECIES.map((s) => s.slug).sort());
  });

  it("rejects manufacturer code 999 (test chips) at the database level", async () => {
    await expect(
      db.insert(microchipManufacturerCodes).values({
        code: 999,
        manufacturer: "Test",
        source: "test",
      }),
    ).rejects.toThrow();
  });

  it("has the pgvector extension installed", async () => {
    const rows = await client`select extname from pg_extension where extname = 'vector'`;
    expect(rows).toHaveLength(1);
  });
});
