# Toolchain And Coding Conventions

## Purpose
Current source is strict TypeScript ESM in both apps. Keep code direct and small; do not infer domain conventions not present yet.

## Established Conventions
- API uses strict NodeNext TypeScript and isolatedModules: apps/api/tsconfig.json.
- CMS uses strict Vue TypeScript with noUnusedLocals/noUnusedParameters: apps/cms/tsconfig.app.json.
- Prettier uses single quotes, trailing commas, width 100 in each app config.
- ESLint uses flat config; dist and coverage are ignored.
- Policy names are camelCase TypeScript/API JSON, snake_case PostgreSQL, UPPER_SNAKE_CASE environment.

## Code Pattern
~~~ts
export function loadEnv(input: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(input);
  if (result.success) return result.data;
  throw new Error('Invalid environment: ...');
}
~~~
Derived from apps/api/src/config/env.ts. Use named exports and focused functions when a real caller needs them.

## Avoid
Do not add generic utilities, factories, interfaces, dependencies, casts, or any merely to anticipate future layers. Do not mass-format unrelated files.

## Verify
bun run lint; bun run typecheck; bun run test; bun run format:check; CMS build: bun run --cwd apps/cms build.
