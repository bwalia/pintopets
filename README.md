# PintoPets

A pet care platform for all kinds of animals: pet records, everyday questions answered from a vet-approved knowledge base, a community forum, and microchip and ownership tools. Domain: **pintopets.app**.

Phase 1 is the web dashboard (this repo). It is built API-first so the iOS and Android apps (Phase 2) can use the same `/api/v1` endpoints.

## Repo layout

```
apps/web               Next.js app (dashboard + /api/v1 route handlers)
packages/db            Drizzle schema, migrations, seed data
packages/api-contract  zod schemas → OpenAPI 3.1 (/api/v1/openapi.json)
packages/ui            design tokens + shared components (Tailwind 4, shadcn-style)
packages/config        shared tsconfig and ESLint config
```

Later milestones add `packages/ai`, `packages/core` and `packages/emails`, and later still `apps/ios` and `apps/android`.

## Getting started

Requirements: Node 24 (`.nvmrc`), pnpm 12, Docker.

```bash
pnpm install
cp .env.example .env.local      # defaults work for local development
pnpm db:up                      # Postgres 17 + pgvector in Docker
pnpm db:migrate && pnpm db:seed # tables + species, breeds, chip manufacturer codes
pnpm dev                        # http://localhost:3000
```

## Everyday commands

| Command                                      | What it does                                                      |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                                   | Run the web app                                                   |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Checks across all packages                                        |
| `pnpm test:e2e`                              | Playwright tests (phone + desktop, with axe accessibility checks) |
| `pnpm db:generate`                           | Create a migration after changing `packages/db/src/schema`        |
| `pnpm db:check`                              | Fail if the schema and migrations have drifted (runs in CI)       |
| `pnpm db:studio`                             | Browse the database                                               |

## Conventions

- TypeScript strict, no `any` without an explanatory comment.
- Every API error is `{ error: { code, message, details } }` (`packages/api-contract/src/errors.ts`).
- Route handlers are thin: parse input with zod, check permissions, call a service in `apps/web/src/server`.
- Every new endpoint is registered in `packages/api-contract` so it appears in the OpenAPI spec.
- UI text lives in `apps/web/messages/en-GB.json` (next-intl), ready for more languages.
- Secrets live only in `.env.local` or the hosting provider. Never commit them.

## Useful pages (local)

- `/design`: design system preview (colours, buttons, badges, alerts)
- `/api/v1/health`: health check
- `/api/v1/openapi.json`: API spec
