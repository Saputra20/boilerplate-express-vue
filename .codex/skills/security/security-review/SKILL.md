---
name: security-review
description: Review project-specific authentication, authorization, input, secret, and endpoint risks.
---
# Security Review

Activate for auth, JWT, permissions, user input, uploads, sensitive data, API endpoints, secrets, payments, or third-party integration.

- Zod at trust boundaries; centralized safe errors; Helmet, CORS, rate limits, body limits, request IDs, and graceful shutdown remain intact.
- JWT: RS256 only; verify issuer, audience, expiry, applicable nbf, JTI, and revocation/session policy.
- Passwords: Argon2id; never log/store plaintext.
- Authorization: explicit user → role → permission → action; server decides; deny by default; no isAdmin design.
- Review SQL injection, XSS, CSRF where cookies apply, SSRF, file handling, data exposure, audit behavior, and sensitive logging as relevant.
- Never expose tokens, passwords, private keys, secrets, raw credentials, or internal production stacks.

## Project Reference

- Read references/security-review.md before applying this skill to repository code.
