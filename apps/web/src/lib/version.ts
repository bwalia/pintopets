/** Deployed version: the Git commit on Vercel, "dev" locally. */
export const APP_VERSION: string =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.npm_package_version ?? "dev";
