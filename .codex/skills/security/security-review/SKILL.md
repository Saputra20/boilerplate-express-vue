---
name: security-review
description: Review project-specific authentication, authorization, input, secret, and endpoint risks.
---
# Security Review

Activate for auth, JWT, permissions, user input, uploads, sensitive data, API endpoints, secrets, payments, or third-party integration.

- Zod at trust boundaries; centralized safe errors; Helmet, exact-origin allowlist CORS without wildcard/credentials, bounded IP rate limits with safe proxy handling, body limits, request IDs, and graceful shutdown remain intact.
- JWT: RS256 only; `sub` is stable `users.id` UUID, never session identity. Require explicit access/refresh token type, UUID JTI, issuer, audience, expiry, applicable `nbf`, and revocation/session policy. Keep consumed claims typed and minimal; do not trust unknown claims or embed mutable roles/permissions without approval.
- Passwords: Argon2id; enforce approved length without arbitrary composition rules and never trim/mutate credential input. Never log/store plaintext or encoded hashes. Breach checks and forced password expiration need separate approval.
- Login/session: use identical public failure for unknown, wrong-password, disabled, and soft-deleted accounts. Only active non-deleted users authenticate. Persist sessions, hashed refresh-token metadata, and mandatory redacted security audit events atomically; do not persist access tokens or raw refresh tokens.
- Refresh rotation: require typed refresh JWT/session/fingerprint linkage, atomically consume each token, and preserve consumed metadata for replay detection. Confirmed reuse revokes only compromised session and active refresh records; concurrent refresh cannot mint multiple children; session expiry is hard cap; public failures remain generic.
- Authorization: explicit user → role → permission → action; server decides; deny by default; no isAdmin design.
- Review SQL injection, XSS, CSRF where cookies apply, SSRF, file handling, data exposure, audit behavior, and sensitive logging as relevant.
- Never expose tokens, passwords, private keys, secrets, raw credentials, or internal production stacks.

## Project Reference

- Read references/security-review.md before applying this skill to repository code.
