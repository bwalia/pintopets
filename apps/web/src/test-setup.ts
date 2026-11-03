import { config } from "dotenv";
import { vi } from "vitest";

// Repo-root env (OPSAPI_*) for integration tests; `server-only` is a
// Next.js build-time guard with nothing to do in tests.
config({ path: ["../../.env.local", "../../.env"], quiet: true });
vi.mock("server-only", () => ({}));
