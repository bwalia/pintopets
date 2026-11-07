# PintoPets

A pet care platform for all kinds of animals: pet records, everyday questions answered from a vet-approved knowledge base, a community forum, and microchip and ownership tools. Domain: **pintopets.app**.

Phase 1 is the web dashboard (this repo). It is built API-first so the iOS and Android apps (Phase 2) can use the same `/api/v1` endpoints.

## Repo layout

```
apps/web               Next.js app (dashboard + /api/v1 route handlers)
packages/db            reference data (species, breeds, microchip codes)
opsapi/pintopets       OpsAPI plugin: tables, REST API and admin pages for all pet data
packages/api-contract  zod schemas → OpenAPI 3.1 (/api/v1/openapi.json)
packages/ui            design tokens + shared components (Tailwind 4, shadcn-style)
packages/config        shared tsconfig and ESLint config
```

Later milestones add `packages/ai`, `packages/core` and `packages/emails`, and later still `apps/ios` and `apps/android`.

## Getting started

Requirements: Node 24 (`.nvmrc`), pnpm 12, Docker.

PintoPets keeps its data in [OpsAPI](https://github.com/bwalia/opsapi), through
the `pintopets` plugin in `opsapi/pintopets` (tables, REST API, admin pages).

```bash
pnpm install
cp .env.example .env.local      # then set OPSAPI_API_KEY (below)
pnpm opsapi:up                  # local OpsAPI + plugin on http://localhost:4042
pnpm opsapi:key                 # prints OPSAPI_API_KEY for .env.local
pnpm dev                        # http://localhost:3000 (DEMO_AUTH=true signs you in)
```

Changing the plugin: edit `opsapi/pintopets` (or add a resource with
`docker run … bwalia/opsapi opsapi make:resource pintopets …`), restart with
`pnpm opsapi:up`, then `pnpm opsapi:types` to refresh the generated client types.

## Everyday commands

| Command                                      | What it does                                                      |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                                   | Run the web app                                                   |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Checks across all packages                                        |
| `pnpm test:e2e`                              | Playwright tests (phone + desktop, with axe accessibility checks) |
| `pnpm opsapi:up` / `opsapi:down`             | Local OpsAPI with the plugin                                      |
| `pnpm opsapi:types`                          | Regenerate typed OpsAPI client paths                              |

## Conventions

- TypeScript strict, no `any` without an explanatory comment.
- Every API error is `{ error: { code, message, details } }` (`packages/api-contract/src/errors.ts`).
- Route handlers are thin: parse input with zod, check permissions, call a service in `apps/web/src/server`; services read and write OpsAPI.
- Every new endpoint is registered in `packages/api-contract` so it appears in the OpenAPI spec.
- UI text lives in `apps/web/messages/en-GB.json` (next-intl), ready for more languages.
- Secrets live only in `.env.local` or the hosting provider. Never commit them.

## Community forum

`/community`: topics, search, sort (latest, most helpful, unanswered), threads,
replies, "helpful" votes and accepted answers. Reading is public; posting needs
an account. API: `/api/v1/community/*` (in the OpenAPI spec).

Safety, enforced on the server (`apps/web/src/server/community`):

- Authors show only a community name (set on `/account`), never their email;
  official-looking names ("Vet", "Moderator", "PintoPets") are refused.
- Phone numbers, email addresses, link shorteners, more than 3 links, shouting and
  repeated characters are blocked; invisible/bidi characters are stripped.
- Posts render as plain text (no HTML); links get `rel="nofollow ugc noopener"`.
- Per-person rate limits counted in the database (5 threads and 40 replies an
  hour, 200 votes an hour, 30 reports a day) and duplicate-post detection.
- 3 reports from different people hide a post until a moderator reviews it.
- Moderators (`MODERATOR_EMAILS`) get `/moderation`: hide, restore, remove,
  lock, pin, and pause members (pausing needs a 2FA step-up). Every action is
  written to an audit log.

## Useful pages (local)

- `/design`: design system preview (colours, buttons, badges, alerts)
- `/api/v1/health`: health check
- `/api/v1/openapi.json`: API spec
