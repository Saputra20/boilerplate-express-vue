# fe/05-api-client — API Client

## 1. Metadata
| Field | Value |
| --- | --- |
| Task ID | `fe/05-api-client` |
| Batch | N/A |
| Owning Feature | CMS API transport |
| Workstream | Frontend |
| Task Category | API client |
| Repository/App | `apps/cms` |
| Status | Implemented — verified |
| Priority | Foundation |
| Suggested Size | Medium |
| Depends On | `fe/02-environment-validation` |
| Blocks | `fe/06-auth-state`, `fe/10-ux-states` |
| Execution Order | 5 |

**Contract Status:** Ready.

**Execution Status:** Implemented and verified; `fe/02` is complete.

## 2. Outcome
Create one typed Axios client boundary using `VITE_API_BASE_URL`, 10-second timeout, safe error normalization, optional bearer injection, and no generic automatic retries.

## 3. Context
Axios exists but no client implementation. Backend OpenAPI defines auth v1 routes and token schemas. No frontend-consumable profile/permission endpoint exists.

## 4. Dependencies
Use existing Axios and Zod. Auth/session orchestration belongs to `fe/06`; permission data remains blocked in `fe/09`.

## 5. In Scope
- Public and protected JSON requests.
- `Authorization: Bearer <accessToken>` support through explicit request/client boundary.
- 10-second timeout.
- Normalize validation, 401, 403, 429, 5xx, timeout, and network failures.
- Preserve safe backend message/status and documented diagnostic metadata only.
- Focused tests with mocked transport.

## 6. Out of Scope
Persistent auth storage, 401 refresh orchestration, generic retries, mutation retries, invented endpoints, profile/permission endpoint, and API authorization decisions.

## 7. Existing Implementation
`apps/cms/src/api/client.ts` provides the typed Axios boundary, `apps/cms/src/api/types.ts` provides Zod-backed request/response contracts, and `apps/cms/tests/api-client.test.ts` covers transport and failure behavior. The client uses the validated `VITE_API_BASE_URL` supplied by callers; auth/session orchestration remains out of scope.

## 8. Implementation Requirements
Use camelCase JSON and current `/api/v1/auth/*` paths. Do not log tokens, credentials, stack traces, or raw response internals. No automatic application-level retry; future safe opt-in requires endpoint contract.

## 9. Applicable Contracts
**Configuration:** `VITE_API_BASE_URL`; timeout `10s`; no new env.

**API:** login body `{ email, password }`; refresh body `{ refreshToken }`; token response `{ accessToken, refreshToken, tokenType: "Bearer", expiresIn }`; logout/logout-all bearer and `204`; errors `400`, `401`, `413`, `429`, `500`. Backend permission failures are `403` from permission middleware, though no current CMS endpoint exposes permission data.

**Database/UI:** Not applicable.

## 10. File Impact
Expected Create/Modify: API client module, types/schemas, tests. Expected Not Modified: backend, dependencies, manifests, lockfiles, and auth store.

## 11. Runtime Behavior
Validated base URL → request config → optional bearer header → JSON response or normalized safe error → 401 returned to auth/session layer without refresh recursion.

## 12. Error And Edge Cases
Distinguish 401 from 403; normalize 429, 5xx, timeout, and network failure; preserve safe status/message; never expose sensitive internals.

## 13. Security Requirements
Bearer headers and tokens are credentials. Client does not persist them, log them, or claim authorization from response/UI state.

## 14. Test Requirements
Test base URL, timeout, JSON, bearer/public requests, each error class, timeout/network failures, safe normalization, and no secret leakage.

## 15. Task-Level Expected Results
- Single typed transport boundary exists.
- Auth API contracts are consumed exactly.
- 401 remains auth-state responsibility; 403 remains authorization failure.

## 16. Acceptance Criteria
- [x] Current auth paths/schemas match OpenAPI.
- [x] Timeout is 10 seconds.
- [x] No generic automatic retry exists.
- [x] Error classes normalize safely and distinctly.
- [x] Focused tests prove protected/public transport and failures.

## 17. Anti-Slop Requirements
Primary `frontend-patterns`; optional `api-design`; final `tdd-workflow`, `antislop`, `verification-loop`. No UI specialist.

## 18. Validation Requirements
Focused/full tests, lint, typecheck, build, Anti-Slop, `git diff --check`, and API contract review against OpenAPI.

## 19. Completion Evidence
`apps/cms/src/api/client.ts` uses `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`, and `/api/v1/auth/logout-all`; validates token responses with Zod; applies a 10-second timeout; injects bearer tokens only through explicit request/client boundaries; and performs no automatic retry. `apps/cms/tests/api-client.test.ts` passes 12 focused tests. Full CMS tests, lint, typecheck, and build pass.

## 20. Traceability
Not applicable — project has no traceability ID system.

## 21. Open Points
No request-ID frontend protocol is required; backend request IDs are internal/logging diagnostics and are not exposed as documented response headers. Permission/profile endpoint remains localized to `fe/09`.

## 22. Definition Of Done
Typed client, focused tests, safe errors, static checks, Anti-Slop, contract review, diff/secret review, and human review complete.
