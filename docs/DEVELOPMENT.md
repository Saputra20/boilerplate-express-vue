# Development

## Local Services

`docker compose up -d` starts PostgreSQL and Redis. Apps run locally through Bun.

## Environment

Copy each app's `.env.example` to `.env`. Never create root `.env`. Generate local RS256 keys under `apps/api/secrets/`; key material is ignored.

## Quality Gate

Run only checks relevant to approved task: selected anti-slop checks, lint, typecheck, tests, build if relevant, `git diff --check`, and manual diff review. Record actual command outcomes.
