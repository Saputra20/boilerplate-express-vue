# API Foundation Pattern

## Purpose
Guide Express/Bun work from current source. Route/controller/service/repository layers are planned but not implemented.

## Established Pattern
apps/api/src/server.ts validates config before listen. apps/api/src/app.ts exports the Express app for tests, disables x-powered-by, applies 1 MB JSON parsing, and ends with fallback 404.

~~~ts
export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use((_request, response) => {
  response.status(404).json({ message: 'Not found' });
});
~~~
Source: apps/api/src/app.ts.

## Workflow
1. Inspect app.ts/server.ts/config/env.ts.
2. Add only task-approved middleware or route boundary.
3. Keep fallback after future routes.
4. Export testable boundaries and add Supertest behavior coverage.

## Not Established
No route registry, controller, service, repository, database client, Redis client, auth middleware, logging middleware, or centralized error middleware exists.

## Existing Examples
apps/api/tests/app.test.ts demonstrates Supertest against exported app.
