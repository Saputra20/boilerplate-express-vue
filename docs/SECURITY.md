# Security

- Environment validates with Zod and fails startup on invalid values.
- JWT uses RS256; private key remains only in `apps/api/secrets/`, ignored by Git.
- Passwords use Argon2id.
- Require issuer, audience, expiry, JTI, revocation, and applicable `nbf` validation.
- Current-session logout and all-session logout remain separate explicit actions. Session revocation is a primary authentication invalidation check; access-JTI revocations persist only until token expiry and raw JWTs never persist. Revocation storage must be enforced by authentication middleware.
- Authorization resolves persistent user-role-permission relations, denies by default, and uses explicit route permission declarations. Client/UI state, JWT snapshots, and hard-coded admin bypasses never grant access; resource-owning tasks define row-level policy.
- Add Helmet, strict CORS, rate limits, body limits, request IDs, audit trail, safe error handling, and graceful shutdown in approved tasks.
- Logs never contain credentials, passwords, tokens, secrets, or private key content.
- Operational dashboards require explicit authentication in every environment, remain read-only unless mutation is separately approved, and never log credentials or headers. Browser tooling using Basic/cookie credentials requires explicit CSRF policy before any mutable action.
- Audit records are durable history, not ordinary logs. They are append-only, metadata is explicitly allowlisted and bounded, and audit rows never contain raw credentials, tokens, secrets, or whole request/response payloads.
- Required security/state changes fail closed when their owning contract requires durable audit in the same transaction. Explicit informational audit may be best-effort. Source-record deletion never cascades into audit history; public audit reads need an approved RBAC contract.
