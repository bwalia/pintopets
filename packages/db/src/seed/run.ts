import { createDb } from "../client";
import { loadDatabaseUrl } from "../env";
import { seedReferenceData } from "./reference";

const { db, client } = createDb(loadDatabaseUrl(), { max: 1 });

try {
  const counts = await seedReferenceData(db);
  console.info(
    `Seeded ${counts.species} species, ${counts.breeds} breeds, ${counts.manufacturerCodes} chip manufacturer codes.`,
  );
} finally {
  await client.end();
}
