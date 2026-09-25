# be/25-authenticated-rbac-context — Authenticated RBAC Context

## 1. Metadata
| Field | Value |
| --- | --- |
| Task ID | `be/25-authenticated-rbac-context` |
| Batch | N/A |
| Owning Feature | Frontend-consumable authenticated RBAC context |
| Workstream | Backend |
| Task Category | API contract / authorization context |
| Repository/App | `apps/api` |
| Status | Complete — implementation and validation evidence recorded below |
| Priority | Security-sensitive |
| Suggested Size | Medium |
| Depends On | `be/04-identity-schema`, `be/10-login-session`, `be/12-logout-revocation`, `be/13-rbac-permissions`, `be/23-versioned-openapi-swagger` |
| Blocks | `fe/09-permission-guard` |
| Execution Order | 25 |

## 2. Outcome
Expose one approved, bearer-authenticated API capability that returns the current authenticated user's frontend-safe identity and effective permission keys for CMS UX hydration. Backend authorization remains authoritative.

## 3. Context
Current backend persists users, roles, permissions, user-role links, and role-permission links. Authentication middleware exposes a verified access principal to downstream handlers. RBAC middleware authorizes one required permission and returns safe `401`/`403` responses. No current route or OpenAPI operation exposes effective permissions to CMS.

## 4. Dependencies
Use existing auth identity and RBAC repository/service boundaries. Use existing versioned routing and module-owned OpenAPI conventions. No Redis cache, new permission catalog, migration, role-management API, or frontend implementation is part of this task.

## 5. In Scope
- Define and implement one auth-owned authenticated-context capability after endpoint path approval.
- Resolve the authenticated user from verified backend auth context, not client input.
- Resolve current effective permission keys through existing RBAC data-access logic.
- Return only the minimum frontend-safe identity and permission data required by `fe/09`.
- Add focused backend tests and module-owned OpenAPI coverage.
- Define safe failure behavior and freshness semantics for frontend session hydration.

## 6. Out of Scope
- Role/permission CRUD, business permission catalog, row-level authorization, ownership policy, admin bypass, JWT permission snapshots, permission caching, realtime synchronization, CMS UI, frontend `can()`, and unrelated API changes.

## 7. Existing Implementation
- `apps/api/src/middleware/authentication.middleware.ts` validates bearer access tokens and exposes `sub`, `sid`, `jti`, `exp`, and revocation state.
- `apps/api/src/modules/rbac/services/permission.service.ts` validates permission-code format and resolves one permission through a repository.
- `apps/api/src/modules/rbac/repositories/permission.repository.ts` resolves a persisted user-role-permission grant.
- `apps/api/src/modules/auth/` owns authentication transport and session behavior.
- `apps/api/src/config/openapi/` aggregates module-owned OpenAPI YAML.
- `apps/api/src/config/drizzle/schema.ts` owns users, roles, permissions, user-role, and role-permission persistence.

## 8. Implementation Requirements
- The operation must require bearer authentication.
- The authenticated subject must come from verified access-auth context.
- Effective permissions must be resolved server-side from persisted relations; frontend must not recompute role-to-permission joins.
- The response must use repository camelCase JSON conventions and stable permission keys from `permissions.code`.
- Do not expose password hashes, access/refresh tokens, token hashes, session secrets, audit metadata, join-table rows, or unnecessary database fields.
- The approved endpoint is `GET /api/v1/me`.
- The approved response is `{ user: { id, email }, roles, permissions }`; `roles` contains role codes and `permissions` contains effective permission codes.

## 9. Applicable Contracts
**API Contract:** `GET /api/v1/me`, bearer-authenticated, returns the current active user's `id` and `email`, assigned role codes, and effective permission codes.

**Response Contract:** `{ "user": { "id": "<uuid>", "email": "<email>" }, "roles": ["<role-code>"], "permissions": ["<permission-code>"] }`. No persistence or security fields are exposed.

**Authorization Contract:** Backend remains the enforcement authority. Client visibility, Pinia state, route metadata, and JWT claims never grant access.

## 10. File Impact
**Expected Create/Modify:** Auth module route/controller/service boundary as required by existing architecture, RBAC read/query boundary only if existing service cannot provide effective keys, module OpenAPI YAML, focused backend tests, and task evidence.

**Expected Not Modified:** CMS source, migrations, package manifests, lockfiles, role/permission management, unrelated business modules, and existing permission middleware behavior.

## 11. Runtime Behavior
Authenticated request → access middleware validates bearer token → context capability resolves active authenticated user and effective permission keys → safe stable response. Missing/invalid auth returns existing generic `401`. Internal lookup/configuration failure returns existing centralized safe server error. Logout or failed restoration causes frontend to discard cached context; backend remains authoritative on every protected request.

## 12. Error And Edge Cases
| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Missing or invalid bearer token | Existing generic `401` envelope | No identity disclosure |
| Authenticated user with no effective permissions | Successful response with empty permission list | Deny-by-default UX |
| Disabled/deleted user rejected by current auth policy | Existing generic authentication failure | No account-state disclosure |
| Duplicate role grants | One stable permission key per effective permission | No duplicate response entries |
| Multiple roles | Union of effective permissions through existing RBAC relations | No role-name bypass |
| Database/RBAC failure | Centralized safe `500` | No SQL/internal detail |
| Unexpected sensitive data | Omitted from response and logs | No credential exposure |

## 13. Security Requirements
Preserve bearer authentication, deny-by-default authorization, safe `401`/`403` semantics, minimal response data, no sensitive logging, no hard-coded admin bypass, no role-label authorization, and no JWT permission inference.

## 14. Test Requirements
| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Authenticated request | Stable frontend-safe context response | Integration |
| Missing/invalid auth | Generic `401` | Integration |
| User identity | Subject maps to correct active user | Integration |
| Multiple roles | Effective permissions union correctly | Integration |
| No effective permissions | Empty permission list, successful response | Integration |
| Disabled/deleted user | Existing auth policy applies | Integration |
| Sensitive fields | Tokens, hashes, joins, and audit data absent | Contract/integration |
| OpenAPI | Method/path/schema/security/errors match implementation | Contract |
| Reuse | Existing RBAC resolution boundary is reused; no controller join logic | Unit/review |

## 15. Task-Level Expected Results
- One approved backend capability exists for CMS RBAC hydration.
- Effective permission keys come from persisted backend relations.
- Response is minimal, stable, authenticated, and OpenAPI-documented.
- Existing authorization middleware remains unchanged and authoritative.
- `fe/09` can consume the contract without inventing endpoint or permission semantics.

## 16. Acceptance Criteria
- [x] Endpoint method/path and response fields are explicitly approved and documented.
- [x] Bearer authentication identifies the current user from verified auth context.
- [x] Effective permissions resolve through existing RBAC persistence/service boundaries.
- [x] No sensitive or internal join data appears in the response.
- [x] Empty permissions, multiple-role union, invalid auth, and disabled/deleted-user behavior are covered by implementation and focused tests.
- [x] OpenAPI and implementation agree.
- [x] Backend remains authorization authority; no client-only grant is introduced.

## 17. Anti-Slop Requirements
Use `api-design`, `architecture`, `backend-patterns`, `security-review`, and `database-patterns` only where implementation requires them. Use `tdd-workflow`, `code-review`, `verification-loop`, and core `antislop`. Do not add generic profile abstractions, speculative role APIs, duplicate RBAC resolution, or unused fields.

## 18. Validation Requirements
**Static:** repository lint, typecheck, formatting, and `git diff --check`.

**Automated Tests:** focused auth/RBAC integration and contract tests, then applicable backend suite.

**OpenAPI:** validate aggregated versioned document and operation security/schema alignment.

**Security:** review response fields, logs, auth source, authorization boundary, and error disclosure.

## 19. Completion Evidence
- `GET /api/v1/me` is mounted by `apps/api/src/app.ts` and composed by `apps/api/src/server.ts`.
- `apps/api/tests/me-context.test.ts` covers authenticated response, missing authentication, and absent active context.
- `apps/api/tests/context-service.test.ts` covers identity/role/permission composition and missing-user behavior.
- `apps/api/tests/rbac-permissions.test.ts` covers persisted-relation equivalents and multiple-role permission union.
- `apps/api/src/modules/me/v1/me.openapi.yaml` owns the `/api/v1/me` OpenAPI tag, schemas, and path; auth OpenAPI remains limited to auth operations.
- `apps/api/tests/openapi.test.ts` covers `/api/v1/me`, split module schemas, and bearer security.
- Full API suite: 20 passed suites, 130 passed tests; 2 integration suites skipped by existing environment requirements.
- `bun run --cwd apps/api typecheck`, `lint`, and `format:check` pass.
- `git diff --check` and changed-file/security/scope review pass.

## 20. Traceability
Not applicable — project has no traceability ID system.

## 21. Open Points
None. Human approval selected `GET /api/v1/me` and approved `user.id`, `user.email`, role codes, and effective permission codes.

## 22. Definition Of Done
- [x] Approved endpoint and response contract implemented without invented product permissions.
- [x] Existing auth/RBAC boundaries reused.
- [x] Focused tests and OpenAPI validation pass.
- [x] Security, Anti-Slop, changed-file, secret, and scope reviews pass.
- [x] `git diff --check` passes and no unrelated files change.
- [x] Human review confirms response fields, dynamic-menu usage, and separate `me` OpenAPI ownership remain within approved scope.
