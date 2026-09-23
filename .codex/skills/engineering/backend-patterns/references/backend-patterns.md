# API Module-First Pattern

## Purpose
Guide Express/Bun work from current source without bypassing approved module ownership.

## Established Pattern
`apps/api/src/server.ts` validates config before listen. `apps/api/src/app.ts` exports the Express app for tests, composes middleware/routes, and ends with fallback 404. Business behavior belongs in `modules/<module>/`; cross-cutting Express middleware belongs in `middleware/`; infrastructure belongs in `config/`; small stateless technical utilities belong in `helpers/`.

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
1. Inspect `app.ts`, `server.ts`, owning module, and relevant config boundary.
2. Add only task-approved module/config/middleware/helper files; never add a new top-level source directory.
3. Keep request flow `middleware → router → controller → service/use case → repository → database` and fallback after routes.
4. Keep global OpenAPI aggregation in config and module-specific contributions beside routes.
5. Export testable boundaries and add Supertest behavior coverage.

## Existing Examples
`apps/api/tests/` demonstrates Supertest and infrastructure behavior coverage against exported app/module boundaries.
