# AI-Native Fullstack Foundation

Production-oriented TypeScript foundation for incremental, human-gated development. No business module is implemented yet.

## Stack

- API: Bun, Express, TypeScript, Zod, Drizzle/PostgreSQL, Redis, BullMQ, JWT, Argon2id, Pino/Morgan, OpenAPI, Jest.
- CMS: Vue 3, Vite, TypeScript, Pinia, Vue Router, Axios, Zod, Tailwind CSS, Vitest.
- Local services: PostgreSQL and Redis through Docker Compose.

## Layout

`apps/api` Express API.  `apps/cms` Vue CMS.  `docs/` source of truth.  `tasks/` small approved work.  `.codex/` agent roles and workflows.

## Prerequisites

- Bun `1.4+`
- Docker Desktop or compatible Docker Compose
- OpenSSL for local RS256 key generation

## Setup

`bun install`

`cp apps/api/.env.example apps/api/.env`

`cp apps/cms/.env.example apps/cms/.env`

`mkdir -p apps/api/secrets`

`openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out apps/api/secrets/jwt-private.pem`

`openssl rsa -pubout -in apps/api/secrets/jwt-private.pem -out apps/api/secrets/jwt-public.pem`

`docker compose up -d`

No root `.env`. App-local `.env`, logs, and keys stay ignored by Git.

## Development

`bun run dev:api`

`bun run dev:cms`

Database migrations and application infrastructure arrive through approved backend tasks. Docker Compose only provides PostgreSQL and Redis.

## Checks

`bun run lint`

`bun run typecheck`

`bun run test`

`bun --cwd apps/cms run build`

`bun run format:check`

`git diff --check`

`docker compose config`

## Task Workflow

1. Read one directory under `tasks/be/` or `tasks/fe/`.
2. Review `technical.md` and Indonesian `explanation.md`.
3. Human approves task.
4. AI implements only scope and runs relevant anti-slop checks plus stated validation.
5. AI reviews diff. Human reviews result before next task.

`AGENTS.md` is global engineering contract. `docs/` is source of truth. Never start a successor task automatically.

## Architecture Rules

- API flow: middleware → route → controller → service/use case → repository → database.
- API owns authorization: explicit permissions, never client authority or `isAdmin` flags.
- TypeScript/API JSON use camelCase; PostgreSQL uses snake_case.
- CMS uses business-specific feature components, not generic CRUD components.
- No external CMS template or UI kit without license, maintenance, Vue 3, TypeScript, and dependency review.

## Quality Gate

Use reviewed installation procedure for `miqdadbadjuber/anti-slop` before tasks where its checks apply. It is a selective skill gate, not a blanket command. Select only checks relevant to changed code, then run lint, typecheck, behavior tests, relevant build, `git diff --check`, and diff review. Report PASS, FAIL, or NOT RUN for every check; never claim a command passed without output.
