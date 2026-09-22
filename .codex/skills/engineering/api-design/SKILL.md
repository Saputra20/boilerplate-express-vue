---
name: api-design
description: Maintain explicit REST, error, authentication, and OpenAPI contracts.
---
# API Design

Use whenever API contract changes.

- Confirm path, method, auth, permission, request schema, response schema, statuses, errors, pagination/filtering, and idempotency where applicable before code.
- Resource names and API JSON use camelCase. Validate request/query/params with Zod.
- Breaking field/status/auth/permission changes require explicit approved task scope and consumer review.
- Update OpenAPI, tests, and affected CMS client contracts together.
- Do not invent endpoints, error codes, pagination, or permission mappings when docs do not specify them.
