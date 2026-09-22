# be/06-logging-foundation — Logging Foundation

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/06-logging-foundation` |
| Batch | Not specified in source documentation. |
| Owning Feature | Not specified in source documentation. |
| Affected Feature IDs | Not specified in source documentation. |
| Workstream | Backend |
| Category | logging foundation |
| Repository | `apps/api` |
| Platform | Bun / Express API |
| Status | Planned — not executed |
| Priority | Foundation execution order 6 |
| Suggested Size | Small — one reviewable change set |
| Depends On | be/02-environment-validation |
| Blocks | be/07-security-foundation |
| Execution Order | 6 |

## 2. Outcome

Add Morgan/Pino request-correlated terminal/file logging, error/access separation, redaction, and bounded growth behavior.

## 3. Context

`docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/SECURITY.md`, `docs/DESIGN.md`, and `docs/DEVELOPMENT.md` are relevant as applicable. PRD/PRODUCT/DOMAIN contain TODO requirements; no product semantics are inferred. Existing task identity/order is preserved.

## 4. In Scope

- Add Morgan/Pino request-correlated terminal/file logging, error/access separation, redaction, and bounded growth behavior.
- Inspect dependencies and existing implementation before finalizing paths.
- Produce only this task capability and its focused tests/evidence.

## 5. Out of Scope

- Successor tasks and unrelated business modules.
- Generic CRUD, architecture redesign, unrelated refactor, dependency upgrade, or invented requirements.
- Any unresolved item listed in Open Points.

## 6. Implementation Requirements

- Add Morgan/Pino request-correlated terminal/file logging, error/access separation, redaction, and bounded growth behavior.
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

Apply relevant redaction, request correlation, protected access, and no-secret logging rules; do not weaken baseline controls.

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

- [ ] Add Morgan/Pino request-correlated terminal/file logging, error/access separation, redaction, and bounded growth behavior.
- [ ] In Scope work completed without Out of Scope changes.
- [ ] Valid and failure behavior has evidence.
- [ ] No sensitive data is exposed.
- [ ] Required validation and Anti-Slop evidence uses actual status.

### 14.1 Task-Level Expected Results

- [ ] Logging Foundation capability exists at documented boundary.
- [ ] Runtime follows section 9 and errors follow section 10.
- [ ] Unrelated behavior remains unchanged.

## 15. Anti-Slop Requirements

Code Anti-Slop: required. Reject generic abstraction, duplicated logic, dead/unused code or dependency, fake/placeholder implementation, hidden TODO/FIXME/HACK, unjustified any/assertion, and unrelated refactor. UI Anti-Slop and visual verification: not applicable — no CMS UI change.

## 16. Definition of Done

- [ ] Implementation Requirements and Acceptance Criteria satisfied.
- [ ] Scope respected; no unrelated files/architecture change.
- [ ] Required tests and validation pass.
- [ ] Required Anti-Slop checks pass; unavailable check is never reported PASS.
- [ ] Applicable migration/API/OpenAPI/browser evidence exists.
- [ ] `git diff --check`, changed-file review, secret review, and human review completed.

### 16.1 Required Completion Evidence

| Acceptance Criterion | Evidence |
| --- | --- |
| Outcome behavior | Focused test(s) under `apps/api/tests/` or explicit blocked reason |
| Static correctness | `bun run --cwd apps/api lint`; `bun run --cwd apps/api typecheck` |
| Scope hygiene | `git diff --check`, `git diff`, and `git status` review |
| Anti-Slop | Applicable command/tool output or exact NOT RUN reason |

## 17. Traceability

| Source | Requirement / Section | Task Coverage |
| --- | --- | --- |
| `docs/ARCHITECTURE.md` | repository and layer boundaries | Logging Foundation boundary |
| `docs/SECURITY.md` | relevant baseline | security/UI constraints |
| Existing task directory | `be/06-logging-foundation` | task identity/order |
| PRD / PRODUCT / DOMAIN | TODO: REQUIREMENT NEEDED | no IDs or rules invented |

## 18. Open Points

Log rotation size/retention policy is not specified; request clarification before choosing one.
