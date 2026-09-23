# Current Security Baseline

## Purpose
Distinguish present protections from documented future protections.

## Established
- API and CMS environment validation use Zod: apps/api/src/config/env.ts and apps/cms/src/env.ts.
- API validates before listen; CMS validates before mount.
- API disables x-powered-by and limits JSON to 1 MB.
- .gitignore excludes app env files, logs, private key directory contents, build output.

## Established In Current Source
The API currently wires HTTP security, CORS, body limits, request IDs, Pino/Morgan logging, centralized errors, RS256 JWT, Argon2id password hashing, RBAC permission resolution, audit persistence, refresh-token rotation, and revocation through `apps/api/src/**`. Verify each claim against the owning source and tests before extending it.

## Not Automatically Established
Deployment posture, compliance/retention decisions beyond recorded schema/task contracts, and future authorization or API lifecycle policy remain contract decisions. Packages, docs, and task metadata alone never prove them.

## Review Workflow
Inspect env example/parser, startup, .gitignore, and changed trust boundary. For auth/endpoints, require approved contract. Do not report package installation or documentation as security implementation.

## Checklist
- [ ] No password/token/key/secret output or fixture.
- [ ] New input boundary validates.
- [ ] Required config cannot be bypassed.
- [ ] Absent control is reported as absent.
