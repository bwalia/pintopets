import path from "node:path";
import { config as loadEnv } from "dotenv";
import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// One env file for the whole monorepo: load the repo-root .env.local / .env.
// (Next.js on its own only reads env files from apps/web.)
// Existing variables (e.g. set by Vercel or CI) always win. next.config is compiled
// to CommonJS, so use cwd (always apps/web) rather than import.meta.
const repoRoot = path.resolve(process.cwd(), "../..");
loadEnv({ path: [path.join(repoRoot, ".env.local"), path.join(repoRoot, ".env")], quiet: true });

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Baseline security headers (section 6). A nonce-based Content-Security-Policy
 * is added in the security pass (M11), once third-party scripts are known.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(self), interest-cohort=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  transpilePackages: ["@pintopets/ui", "@pintopets/api-contract", "@pintopets/db"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Send browser errors through our own domain so ad blockers don't drop them.
  tunnelRoute: "/monitoring",
  telemetry: false,
});
