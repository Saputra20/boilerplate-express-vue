# Current API Contract

## Purpose
Prevent endpoint design from being guessed. Current API has one established fallback behavior only.

## Established Contract
- Unknown path returns status 404 with JSON body { message: 'Not found' }.
- JSON request size is 1 MB.
- docs/API.md states camelCase JSON policy.
- No business endpoint, schema, error envelope, auth contract, pagination, or OpenAPI route exists.

~~~ts
app.use((_request, response) => {
  response.status(404).json({ message: 'Not found' });
});
~~~
Source: apps/api/src/app.ts; asserted by apps/api/tests/app.test.ts.

## Decision Guide
If task does not specify method, path, auth, permission, request/response, statuses, and errors, STOP or record TODO: REQUIREMENT NEEDED. Do not invent REST/pagination conventions.

## Checklist
- [ ] Contract has request/response and failure behavior.
- [ ] Supertest proves it.
- [ ] OpenAPI impact is updated or explicitly not applicable.
