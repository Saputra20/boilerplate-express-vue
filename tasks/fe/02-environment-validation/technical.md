# fe/02-environment-validation — Environment Validation

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `fe/02-environment-validation` |
| Batch | Not specified in source documentation. |
| Owning Feature | Not specified in source documentation. |
| Affected Feature IDs | Not specified in source documentation. |
| Workstream | Frontend |
| Category | env foundation |
| Repository | `apps/cms` |
| Platform | Vue 3 / Vite CMS |
| Status | Planned — not executed |
| Priority | Foundation execution order 2 |
| Suggested Size | Small — one reviewable change set |
| Depends On | fe/01-initial-project |
| Blocks | fe/03-cms-layout |
| Execution Order | 2 |

## 2. Outcome

Validate documented environment values with Zod before application startup or CMS mount; reject missing, empty, malformed, and unsupported values without exposing secrets.

## 3. Context

`docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/SECURITY.md`, `docs/DESIGN.md`, and `docs/DEVELOPMENT.md` are relevant as applicable. PRD/PRODUCT/DOMAIN contain TODO requirements; no product semantics are inferred. Existing task identity/order is preserved.

## 4. In Scope

- Validate documented environment values with Zod before application startup or CMS mount; reject missing, empty, malformed, and unsupported values without exposing secrets.
- Inspect dependencies and existing implementation before finalizing paths.
- Produce only this task capability and its focused tests/evidence.

## 5. Out of Scope

- Successor tasks and unrelated business modules.
- Generic CRUD, architecture redesign, unrelated refactor, dependency upgrade, or invented requirements.
- Any unresolved item listed in Open Points.

## 6. Implementation Requirements

- Validate documented environment values with Zod before application startup or CMS mount; reject missing, empty, malformed, and unsupported values without exposing secrets.
- CMS bootstrap → read Vite environment → Zod validation → invalid: sanitized error before mount → valid: mount app.
- Validate trust-boundary inputs with Zod where applicable.
- Preserve existing behavior outside task boundary.

### 6.1 Resolved Business Requirements

No business-domain rule is introduced; task is constrained by documented foundation requirements.

## 7. Contract and Data Impact

### 7.1 Configuration Contract

| Variable | Required | Type | Validation | Default | Secret |
| --- | --- | --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | URL | Non-empty absolute URL | None — CMS mount fails | No — public variable |

### 7.2 API Contract

Not applicable — this task does not modify an API contract.

### 7.3 Database Contract

Not applicable — this task does not change a database contract.

### 7.4 UI Contract

Not applicable — this task does not change a CMS UI contract.

## 8. File Impact

Create/Modify: Modify `apps/cms/src/env.ts`, `apps/cms/src/main.ts`, `apps/cms/.env.example`; test under `apps/cms/tests/`.

Test: `apps/cms/tests/`.

Do not modify: unrelated app, successor-task modules, secrets, source-of-truth docs, or task IDs.

## 9. Runtime Behavior

CMS bootstrap → read Vite environment → Zod validation → invalid: sanitized error before mount → valid: mount app.

## 10. Error and Edge Cases

| Scenario | Expected Result |
| --- | --- |
| Missing required value | Sanitized deterministic failure; no unsafe continuation or secret exposure. |
| Empty required string | Sanitized deterministic failure; no unsafe continuation or secret exposure. |
| Invalid numeric value | Sanitized deterministic failure; no unsafe continuation or secret exposure. |
| Unsupported boolean | Sanitized deterministic failure; no unsafe continuation or secret exposure. |
| Malformed URL | Sanitized deterministic failure; no unsafe continuation or secret exposure. |
| Secret-bearing value invalid | Sanitized deterministic failure; no unsafe continuation or secret exposure. |

## 11. Security Requirements

Errors name invalid keys but never print secret values; client environment remains public-only.

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

Not applicable — no meaningful rendered UI change.

### Anti-Slop

Code Anti-Slop: required. Reject generic abstraction, duplicated logic, dead/unused code or dependency, fake/placeholder implementation, hidden TODO/FIXME/HACK, unjustified any/assertion, and unrelated refactor. UI Anti-Slop: not applicable unless rendered UI changes.

## 14. Acceptance Criteria

- [ ] Validate documented environment values with Zod before application startup or CMS mount; reject missing, empty, malformed, and unsupported values without exposing secrets.
- [ ] In Scope work completed without Out of Scope changes.
- [ ] Valid and failure behavior has evidence.
- [ ] No sensitive data is exposed.
- [ ] Required validation and Anti-Slop evidence uses actual status.

### 14.1 Task-Level Expected Results

- [ ] Environment Validation capability exists at documented boundary.
- [ ] Runtime follows section 9 and errors follow section 10.
- [ ] Unrelated behavior remains unchanged.

## 15. Anti-Slop Requirements

Code Anti-Slop: required. Reject generic abstraction, duplicated logic, dead/unused code or dependency, fake/placeholder implementation, hidden TODO/FIXME/HACK, unjustified any/assertion, and unrelated refactor. UI Anti-Slop: not applicable unless rendered UI changes.

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
| `docs/ARCHITECTURE.md` | repository and layer boundaries | Environment Validation boundary |
| `docs/DESIGN.md` | relevant baseline | security/UI constraints |
| Existing task directory | `fe/02-environment-validation` | task identity/order |
| PRD / PRODUCT / DOMAIN | TODO: REQUIREMENT NEEDED | no IDs or rules invented |

## 18. Open Points

None.
