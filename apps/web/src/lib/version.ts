/**
 * Deployed version, read at request time. One image is promoted
 * int → test → acc → prod, so nothing ring-specific is baked in at build time:
 * the Helm chart sets APP_VERSION to the image tag (Ring Promoter checks it via
 * /api/v1/health) and APP_ENV to the ring.
 */
export function appVersion(): string {
  return (
    process.env.APP_VERSION ||
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.npm_package_version ||
    "dev"
  );
}

export type AppEnv = "local" | "int" | "test" | "acc" | "prod";

export function appEnv(): AppEnv {
  const value = process.env.APP_ENV;
  return value === "int" || value === "test" || value === "acc" || value === "prod"
    ? value
    : "local";
}
