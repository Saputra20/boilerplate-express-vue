# Swagger and Versioning Rules

## Developer Workflow

1. Open `/docs`.
2. Redirect lands at `/docs/v1`.
3. Select `Try it out` on a public operation.
4. Login and copy the returned access token.
5. Select `Authorize` and enter bearer JWT.
6. Exercise protected logout operations.
7. Inspect request bodies, response schemas, status codes, and errors.

No Postman collection is required by the project.

## URL Version and Document Version

- API major URL version is `v1` in `/api/v1/*`.
- OpenAPI `info.version` is document/release metadata.
- Changing `info.version` does not create v2.
- A future breaking API compatibility decision creates `/docs/v2` and `/openapi/v2.json`.

## Security

- `bearerAuth` is a reusable HTTP bearer scheme.
- Login, refresh, health, and readiness are public in the document.
- Logout and logout-all declare bearer security.
- `persistAuthorization: false` remains required.
- Examples are synthetic and contain no credentials.

## Isolation

Each Swagger UI explicitly receives its own version document. Future v2 UI must not share mutable document state with v1. Tests and browser verification must prove this, not infer it from TypeScript types.

## Operational Exclusion

`/ops/queues` is a third-party operational dashboard and stays outside the JSON OpenAPI contract. `/health` and `/ready` remain operational paths but are documented as non-versioned probes.
