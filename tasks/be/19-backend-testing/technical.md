# be/19-backend-testing — Backend Testing Foundation

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/19-backend-testing` |
| Batch | Not specified in source documentation. |
| Owning Feature | Not specified in source documentation. |
| Affected Feature IDs | Not specified in source documentation. |
| Workstream | Backend |
| Category | testing foundation |
| Repository | `apps/api` |
| Platform | Bun / Express API |
| Status | Complete — reconciled from existing implementation and validation evidence on 2026-09-23. |
| Priority | Foundation execution order 19 |
| Suggested Size | Small — one reviewable change set |
| Depends On | be/18-health-readiness |
| Blocks | be/20-backend-quality-gate |
| Execution Order | 19 |

## 2. Outcome

Create repeatable isolated test setup/helpers and representative infrastructure tests; do not create coverage theater.

## 3. Context

`docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/SECURITY.md`, `docs/DESIGN.md`, and `docs/DEVELOPMENT.md` are relevant as applicable. PRD/PRODUCT/DOMAIN contain TODO requirements; no product semantics are inferred. Existing task identity/order is preserved.

## 4. In Scope

- Create repeatable isolated test setup/helpers and representative infrastructure tests; do not create coverage theater.
- Inspect dependencies and existing implementation before finalizing paths.
- Produce only this task capability and its focused tests/evidence.

## 5. Out of Scope

- Successor tasks and unrelated business modules.
- Generic CRUD, architecture redesign, unrelated refactor, dependency upgrade, or invented requirements.
- Any unresolved item listed in Open Points.

## 6. Implementation Requirements

- Create repeatable isolated test setup/helpers and representative infrastructure tests; do not create coverage theater.
- Validated configuration → focused infrastructure/module initialization → safe success or sanitized failure; no successor capability is started automatically.
- Validate trust-boundary inputs with Zod where applicable.
- Preserve existing behavior outside task boundary.

### 6.1 Resolved Business Requirements

No business-domain rule is introduced; task is constrained by documented foundation requirements.

## 7. Contract and Data Impact

### 7.1 Configuration Contract

Not applicable — this task does not change documented configuration.

### 7.2 API Contract

Not applicable — this task does not modify an API contract.

### 7.3 Database Contract

Not applicable — this task does not change a database contract.

### 7.4 UI Contract

Not applicable — this task does not change a CMS UI contract.

## 8. File Impact

Create/Modify: Expected location: focused module determined from existing architecture after inspection.

Test: `apps/api/tests/`.

Do not modify: unrelated app, successor-task modules, secrets, source-of-truth docs, or task IDs.

## 9. Runtime Behavior

Validated configuration → focused infrastructure/module initialization → safe success or sanitized failure; no successor capability is started automatically.

## 10. Error and Edge Cases

| Scenario | Expected Result |
| --- | --- |
| Dependency unavailable | Sanitized deterministic failure; no unsafe continuation or secret exposure. |
| Invalid input/configuration | Sanitized deterministic failure; no unsafe continuation or secret exposure. |
| Initialization failure | Sanitized deterministic failure; no unsafe continuation or secret exposure. |
| Shutdown/failure recovery | Sanitized deterministic failure; no unsafe continuation or secret exposure. |

## 11. Security Requirements

Apply Zod at trust boundaries where applicable; preserve safe errors, no secret logging, and existing authorization boundaries.

## 12. Test Requirements

### Happy Path

Prove the documented outcome at focused module/integration boundary.

### Validation / Business Rules

Prove each relevant scenario in section 10.

### Negative / Recovery

Prove failure does not start unsafe work, leak secrets, or leave uncontrolled partial state.

### Isolation / Security

Tests are repeatable, order-independent, use isolated data/environment/mocks, clean up deterministically, and never contain real key material, passwords, or tokens.

### Regression

Existing API shell/Jest behavior remains passing.

### 12.1 Required Verification Scenarios

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Valid documented flow | Outcome occurs | Unit/integration as boundary requires |
| Invalid/failure flow | Safe rejection/failure | Unit/integration |
| Sensitive-data path | No secret output/logging | Focused test |
| Existing shell | No regression | Regression |

## 13. Validation Requirements

### Static

- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `bun run --cwd apps/api test`
- `git diff --check`

### Automated Tests

- Focused and full existing Jest tests applicable to changed boundary.

### Build

Not applicable — API package has no build script; TypeScript typecheck is applicable.

### Database

Not applicable — no migration expected.

### UI

Not applicable — no meaningful rendered UI change.

### Anti-Slop

Code Anti-Slop: required. Reject generic abstraction, duplicated logic, dead/unused code or dependency, fake/placeholder implementation, hidden TODO/FIXME/HACK, unjustified any/assertion, and unrelated refactor. UI Anti-Slop and visual verification: not applicable — no CMS UI change.

## 14. Acceptance Criteria

- [x] Create repeatable isolated test setup/helpers and representative infrastructure tests; do not create coverage theater.
- [x] In Scope work completed without Out of Scope changes.
- [x] Valid and failure behavior has evidence.
- [x] No sensitive data is exposed.
- [x] Required validation and Anti-Slop evidence uses actual status.

### 14.1 Task-Level Expected Results

- [x] Backend Testing Foundation capability exists at documented boundary.
- [x] Runtime follows section 9 and errors follow section 10.
- [x] Unrelated behavior remains unchanged.

## 15. Anti-Slop Requirements

Code Anti-Slop: required. Reject generic abstraction, duplicated logic, dead/unused code or dependency, fake/placeholder implementation, hidden TODO/FIXME/HACK, unjustified any/assertion, and unrelated refactor. UI Anti-Slop and visual verification: not applicable — no CMS UI change.

## 16. Definition of Done

- [x] Implementation Requirements and Acceptance Criteria satisfied.
- [x] Scope respected; no unrelated files/architecture change.
- [x] Required tests and validation pass.
- [x] Required Anti-Slop checks pass; unavailable check is never reported PASS.
- [x] Applicable migration/API/OpenAPI/browser evidence exists.
- [x] `git diff --check`, changed-file review, secret review, and human review completed.

### 16.1 Required Completion Evidence

| Acceptance Criterion | Evidence |
| --- | --- |
| Outcome behavior | Focused test(s) under `apps/api/tests/` or explicit blocked reason |
| Static correctness | `bun run --cwd apps/api lint`; `bun run --cwd apps/api typecheck` |
| Scope hygiene | `git diff --check`, `git diff`, and `git status` review |
| Anti-Slop | Applicable command/tool output or exact NOT RUN reason |

### 16.2 Reconciliation Evidence — 2026-09-23

| Area | Existing Implementation / Validation | Result |
| --- | --- | --- |
| Shared test foundation | `tests/helpers/test-app.ts` reuses real `createApp` composition for app, health, and OpenAPI tests; `tests/helpers/integration.ts` provides only test Redis/PostgreSQL config, UUID namespaces, queue names, and scoped Redis cleanup. | PASS |
| PostgreSQL isolation | `API_INTEGRATION=true` live suite connected to disposable `postgres-test`, created/read a UUID-named table, and dropped it in `afterEach`. | PASS |
| Redis isolation | `API_INTEGRATION=true` live suite connected to disposable `redis-test`, wrote/read UUID-namespaced key, scanned/unlinked only that namespace, and disconnected. | PASS |
| BullMQ cleanup | Live BullMQ foundation suite passed with unique queue names, scoped Redis cleanup, and queue/worker close assertions. | PASS |
| Open handles | Focused, full, and live integration Jest commands ran with `--detectOpenHandles` and completed without uncontrolled handle output. | PASS |
| Focused regressions | Health/readiness, app, login, refresh, logout, and queue-monitor suites: 6 suites / 35 tests passed. | PASS |
| Full API suite | `bun run --cwd apps/api test -- --runInBand --detectOpenHandles`: 18 suites / 124 tests passed; 2 live-integration suites and 6 tests skipped because normal test invocation does not set `API_INTEGRATION=true`. | PASS |
| Static checks | Lint, typecheck, and format check passed. | PASS |
| Anti-Slop | Project-local core skill loaded; helper/test audit found no generic framework, duplicate helper layer, coverage theater, forced exit, hidden TODO/FIXME/HACK, or blocking finding. | PASS — 0 blocking findings |
| Scope and secrets | `git diff --check` passed; changed-file review found no current diff; helper/test review found only synthetic fixture values and no committed runtime credentials, keys, tokens, or logs. | PASS |
| Database/API/browser validation | No schema, migration, API contract, or rendered UI change in be/19. | NOT APPLICABLE |

## 17. Traceability

| Source | Requirement / Section | Task Coverage |
| --- | --- | --- |
| `docs/ARCHITECTURE.md` | repository and layer boundaries | Backend Testing Foundation boundary |
| `docs/SECURITY.md` | relevant baseline | security/UI constraints |
| Existing task directory | `be/19-backend-testing` | task identity/order |
| PRD / PRODUCT / DOMAIN | TODO: REQUIREMENT NEEDED | no IDs or rules invented |

## 18. Open Points

None.
