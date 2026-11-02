import { config } from "dotenv";

// Load repo-root env so integration tests can find DATABASE_URL locally.
config({ path: ["../../.env.local", "../../.env"], quiet: true });
