# Security

- Environment validates with Zod and fails startup on invalid values.
- JWT uses RS256; private key remains only in `apps/api/secrets/`, ignored by Git.
- Passwords use Argon2id.
- Require issuer, audience, expiry, JTI, revocation, and applicable `nbf` validation.
- Add Helmet, strict CORS, rate limits, body limits, request IDs, audit trail, safe error handling, and graceful shutdown in approved tasks.
- Logs never contain credentials, passwords, tokens, secrets, or private key content.
