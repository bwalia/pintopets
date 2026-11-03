# PintoPets web image. One image is promoted int → test → acc → prod, so nothing
# ring-specific is baked in: the Helm chart sets APP_ENV, APP_URL, APP_VERSION
# (the image tag, reported by /api/v1/health for Ring Promoter) and the OpsAPI
# settings at runtime. Pet data lives in OpsAPI (opsapi/pintopets plugin).
#
# All stages run on the target platform: `sharp` (photo processing) is a native
# module, so it must be installed for the architecture that runs it.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache libc6-compat && corepack enable
ENV NEXT_TELEMETRY_DISABLED=1 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /repo

# ── Dependencies (cached unless a manifest or the lockfile changes) ──────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/ui/package.json packages/ui/
COPY packages/api-contract/package.json packages/api-contract/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ── Build ────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN pnpm --filter @pintopets/web build
# `next build` exiting 0 doesn't prove it wrote the standalone bundle.
RUN test -f apps/web/.next/standalone/apps/web/server.js \
 && test -d apps/web/.next/static

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
# Monorepo standalone output mirrors the repo layout: server at apps/web/server.js.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
