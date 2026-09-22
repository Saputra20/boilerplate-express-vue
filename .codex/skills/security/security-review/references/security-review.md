# Current Security Baseline

## Purpose
Distinguish present protections from documented future protections.

## Established
- API and CMS environment validation use Zod: apps/api/src/config/env.ts and apps/cms/src/env.ts.
- API validates before listen; CMS validates before mount.
- API disables x-powered-by and limits JSON to 1 MB.
- .gitignore excludes app env files, logs, private key directory contents, build output.

## Not Currently Established In Source
Helmet, CORS, rate limiting, request IDs, Pino/Morgan setup, centralized errors, JWT, Argon2id use, RBAC, audit trail, and revocation are documented targets, not implementation facts.

## Review Workflow
Inspect env example/parser, startup, .gitignore, and changed trust boundary. For auth/endpoints, require approved contract. Do not report package installation or documentation as security implementation.

## Checklist
- [ ] No password/token/key/secret output or fixture.
- [ ] New input boundary validates.
- [ ] Required config cannot be bypassed.
- [ ] Absent control is reported as absent.
