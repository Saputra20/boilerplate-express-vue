# fe/10-ux-states — Errors Loading And Empty States

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `fe/10-ux-states` |
| Batch | Not specified in source documentation. |
| Owning Feature | Not specified in source documentation. |
| Affected Feature IDs | Not specified in source documentation. |
| Workstream | Frontend |
| Category | ux foundation |
| Repository | `apps/cms` |
| Platform | Vue 3 / Vite CMS |
| Status | Blocked — requirement needed |
| Priority | Foundation execution order 10 |
| Suggested Size | Small — one reviewable change set |
| Depends On | fe/04-theme-design-system, fe/05-api-client |
| Blocks | fe/11-frontend-testing |
| Execution Order | 10 |

## 2. Outcome

Create accessible reusable loading/error/empty primitives only after approved copy, design, and API-error policy.

## 3. Context

`docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/SECURITY.md`, `docs/DESIGN.md`, and `docs/DEVELOPMENT.md` are relevant as applicable. PRD/PRODUCT/DOMAIN contain TODO requirements; no product semantics are inferred. Existing task identity/order is preserved.

## 4. In Scope

- Create accessible reusable loading/error/empty primitives only after approved copy, design, and API-error policy.
- Inspect dependencies and existing implementation before finalizing paths.
- Produce only this task capability and its focused tests/evidence.

## 5. Out of Scope

- Successor tasks and unrelated business modules.
- Generic CRUD, architecture redesign, unrelated refactor, dependency upgrade, or invented requirements.
- Any unresolved item listed in Open Points.

## 6. Implementation Requirements

- Create accessible reusable loading/error/empty primitives only after approved copy, design, and API-error policy.
- CMS interaction/state transition follows approved UI/API contract; unresolved contract blocks implementation before rendered behavior is invented.
- Validate trust-boundary inputs with Zod where applicable.
- Preserve existing behavior outside task boundary.

### 6.1 Resolved Business Requirements

No product behavior is resolved beyond technical foundation. STOP at Open Points; do not infer missing semantics.

## 7. Contract and Data Impact

### 7.1 Configuration Contract

Not applicable — this task does not change documented configuration.

### 7.2 API Contract

Not applicable — this task does not modify an API contract.

### 7.3 Database Contract

Not applicable — this task does not change a database contract.

### 7.4 UI Contract

Not applicable — page/component/design/state contract is unresolved in PRODUCT/DESIGN docs; task is blocked.

## 8. File Impact

Create/Modify: Expected location: focused module determined from existing architecture after inspection.

Test: `apps/cms/tests/`.

Do not modify: unrelated app, successor-task modules, secrets, source-of-truth docs, or task IDs.

## 9. Runtime Behavior

CMS interaction/state transition follows approved UI/API contract; unresolved contract blocks implementation before rendered behavior is invented.

## 10. Error and Edge Cases

| Scenario | Expected Result |
| --- | --- |
| Required contract missing | Sanitized deterministic failure; no unsafe continuation or secret exposure. |
| Dependency missing | Sanitized deterministic failure; no unsafe continuation or secret exposure. |
| Attempt to infer product/API/database/UI behavior | Sanitized deterministic failure; no unsafe continuation or secret exposure. |

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

Existing CMS shell/Vitest behavior remains passing.

### 12.1 Required Verification Scenarios

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Valid documented flow | Outcome occurs | Unit/integration as boundary requires |
| Invalid/failure flow | Safe rejection/failure | Unit/integration |
| Sensitive-data path | No secret output/logging | Focused test |
| Existing shell | No regression | Regression |

## 13. Validation Requirements

### Static

- `bun run --cwd apps/cms lint`
- `bun run --cwd apps/cms typecheck`
- `bun run --cwd apps/cms test`
- `bun run --cwd apps/cms build`
- `git diff --check`

### Automated Tests

- Focused and full existing Vitest tests applicable to changed boundary.

### Build

- `bun run --cwd apps/cms build`

### Database

Not applicable — no migration expected.

### UI

Browser/visual verification required if task becomes unblocked and rendered UI changes.

### Anti-Slop

Code Anti-Slop: required. Reject generic abstraction, duplicated logic, dead/unused code or dependency, fake/placeholder implementation, hidden TODO/FIXME/HACK, unjustified any/assertion, and unrelated refactor. UI Anti-Slop: required; reject generic AI layout, fake content, excessive containers, visual inconsistency, missing responsive/accessibility states. Visual verification: required when unblocked rendered UI changes.

## 14. Acceptance Criteria

- [ ] Create accessible reusable loading/error/empty primitives only after approved copy, design, and API-error policy.
- [ ] In Scope work completed without Out of Scope changes.
- [ ] Valid and failure behavior has evidence.
- [ ] No sensitive data is exposed.
- [ ] Required validation and Anti-Slop evidence uses actual status.

### 14.1 Task-Level Expected Results

- [ ] Errors Loading And Empty States capability exists at documented boundary.
- [ ] Runtime follows section 9 and errors follow section 10.
- [ ] Unrelated behavior remains unchanged.

## 15. Anti-Slop Requirements

Code Anti-Slop: required. Reject generic abstraction, duplicated logic, dead/unused code or dependency, fake/placeholder implementation, hidden TODO/FIXME/HACK, unjustified any/assertion, and unrelated refactor. UI Anti-Slop: required; reject generic AI layout, fake content, excessive containers, visual inconsistency, missing responsive/accessibility states. Visual verification: required when unblocked rendered UI changes.

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
| Outcome behavior | Focused test(s) under `apps/cms/tests/` or explicit blocked reason |
| Static correctness | `bun run --cwd apps/cms lint`; `bun run --cwd apps/cms typecheck` |
| Scope hygiene | `git diff --check`, `git diff`, and `git status` review |
| Anti-Slop | Applicable command/tool output or exact NOT RUN reason |

## 17. Traceability

| Source | Requirement / Section | Task Coverage |
| --- | --- | --- |
| `docs/ARCHITECTURE.md` | repository and layer boundaries | Errors Loading And Empty States boundary |
| `docs/DESIGN.md` | relevant baseline | security/UI constraints |
| Existing task directory | `fe/10-ux-states` | task identity/order |
| PRD / PRODUCT / DOMAIN | TODO: REQUIREMENT NEEDED | no IDs or rules invented |

## 18. Open Points

TODO: REQUIREMENT NEEDED — copy, retry policy, design reference, notification/error-boundary policy.
