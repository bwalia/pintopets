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
    /** OpsAPI, server-to-server (in-cluster URL on k3s1). PintoPets' data lives there. */
    OPSAPI_URL: z.url(),
    /** OpsAPI as the browser sees it (hosted sign-in). Defaults to OPSAPI_URL. */
    OPSAPI_PUBLIC_URL: z.url().optional(),
    /** The PintoPets workspace in OpsAPI. */
    OPSAPI_NAMESPACE: z.string().min(1).default("pintopets"),
    /** opsk_ API key scoped to the pintopets_* modules (PintoPets' server only). */
    OPSAPI_API_KEY: z.string().startsWith("opsk_", "OPSAPI_API_KEY must be an OpsAPI key (opsk_…)"),
    /** Signs the PintoPets session cookie. 32+ random characters. */
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters").optional(),
    /** AES-256-GCM key (32 bytes, base64) for TOTP secrets stored in OpsAPI. */
    TOTP_ENCRYPTION_KEY: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z
        .string()
        .refine(
          (v) => Buffer.from(v, "base64").length === 32,
          "TOTP_ENCRYPTION_KEY must be 32 bytes, base64",
        )
        .optional(),
    ),
    /**
     * Community moderators: comma-separated sign-in emails. They see the
     * moderation queue and can hide posts, lock threads and suspend members.
     */
    MODERATOR_EMAILS: z
      .string()
      .default("")
      .transform((v) =>
        v
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean),
      ),
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
