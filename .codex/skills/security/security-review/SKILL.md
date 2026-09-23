---
name: security-review
description: Review project-specific authentication, authorization, input, secret, and endpoint risks.
---
# Security Review

Activate for auth, JWT, permissions, user input, uploads, sensitive data, API endpoints, secrets, payments, or third-party integration.

- Zod at trust boundaries; centralized safe errors; Helmet, exact-origin allowlist CORS without wildcard/credentials, bounded IP rate limits with safe proxy handling, body limits, request IDs, and graceful shutdown remain intact.
- JWT: RS256 only; `sub` is stable `users.id` UUID, never session identity. Require explicit access/refresh token type, UUID JTI, issuer, audience, expiry, applicable `nbf`, and revocation/session policy. Keep consumed claims typed and minimal; do not trust unknown claims or embed mutable roles/permissions without approval.
- Passwords: Argon2id; never log/store plaintext.
- Authorization: explicit user → role → permission → action; server decides; deny by default; no isAdmin design.
- Review SQL injection, XSS, CSRF where cookies apply, SSRF, file handling, data exposure, audit behavior, and sensitive logging as relevant.
- Never expose tokens, passwords, private keys, secrets, raw credentials, or internal production stacks.

## Project Reference

- Read references/security-review.md before applying this skill to repository code.
