import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once on first use. Fails fast with a clear
 * message instead of a confusing runtime error deep in a request.
 * Later milestones add their keys here (see .env.example).
 */
const ServerEnv = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: z.url().default("http://localhost:3000"),
    DATABASE_URL: z
      .string()
      .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a postgres:// connection string"),
    NEXT_PUBLIC_SENTRY_DSN: z.union([z.url(), z.literal("")]).optional(),
    APP_ENV: z.enum(["local", "int", "test", "acc", "prod"]).default("local"),
    /**
     * Demo sign-in: everyone shares one demo account. Only until real sign-in
     * (Google + magic link, M2) lands; never allowed on prod.
     */
    DEMO_AUTH: z
      .enum(["true", "false", ""])
      .default("false")
      .transform((v) => v === "true"),
    /** Where uploaded photos are stored (a persistent volume in k3s). */
    MEDIA_DIR: z.string().min(1).default(".data/media"),
    /** Largest photo upload accepted, in bytes. */
    MAX_UPLOAD_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 1024 * 1024),
  })
  .refine((e) => !(e.DEMO_AUTH && e.APP_ENV === "prod"), {
    message: "DEMO_AUTH must never be enabled on prod",
    path: ["DEMO_AUTH"],
  });

export type ServerEnv = z.infer<typeof ServerEnv>;

let cached: ServerEnv | undefined;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = ServerEnv.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${problems}\nSee .env.example.`);
  }
  return result.data;
}

export function env(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
