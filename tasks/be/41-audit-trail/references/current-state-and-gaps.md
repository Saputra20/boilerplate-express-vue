# Audit Trail Current State and Gaps

Evidence date: 2026-10-02. Source and active configuration win over planned documents.

## Established implementation

| Area                          | Current evidence                                                  | State                                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generic storage               | `apps/api/src/config/drizzle/schema/audit-events.schema.ts`       | `audit_events` exists with UUID ID, event type, actor, resource, outcome, reason, request/session, IP, user agent, JSONB metadata, and `created_at` |
| Generic writer                | `apps/api/src/modules/audit/services/audit.service.ts`            | Required transactional and informational best-effort append methods exist                                                                           |
| Generic repository            | `apps/api/src/modules/audit/repositories/audit.repository.ts`     | Insert plus age-based cleanup exist; no read/update method exists                                                                                   |
| Validation                    | `apps/api/src/modules/audit/services/audit.service.ts`            | Event taxonomy, actor rules, identifiers, metadata JSON safety, nested forbidden-key scan, 8 KiB bound, IP/user-agent bounds exist                  |
| Generic retention boundary    | Same service/repository                                           | Cleanup deletes rows older than 90 days; no scheduler is present                                                                                    |
| Auth-specific storage         | `apps/api/src/config/drizzle/schema/auth-audit-events.schema.ts`  | Separate `auth_audit_events` exists for constrained login/refresh/reuse/revocation/logout vocabulary                                                |
| Historical reference behavior | Both schema files                                                 | User/session foreign keys use `ON DELETE SET NULL`; history is not cascade-deleted                                                                  |
| Generic writer tests          | `apps/api/tests/audit-trail.test.ts` plus integration suites      | Validation, fail-closed behavior, best-effort safe logging, cleanup boundary, and concrete emitters have coverage                                   |
| Generic emitters              | Auth repositories; category, role, and user repositories/services | Profile, password, verification, recovery, category, role, and user changes already emit generic events                                             |
| Foundation task               | `tasks/be/14-audit-trail/technical.md`                            | COMPLETE with recorded persistence/migration evidence; successor must not rebuild it                                                                |
| Durable rules                 | `docs/DATABASE.md`, `docs/SECURITY.md`, `AGENTS.md`               | Audit is append-only, bounded, secret-free durable history; public reads require approved RBAC                                                      |

## Missing implementation after approval

Saputra's phase 1 decisions are recorded in `approved-requirements.md`. Rows below describe current source gaps, not unresolved product approval.

| Gap                                     | Current evidence                                                                                               | Approved consequence                                                                                        |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Durable project docs                    | `docs/PRD.md`, `docs/PRODUCT.md`, and `docs/DOMAIN.md` still contain requirement-needed placeholders           | Task-specific named approval governs `be/41`; implementation must not claim docs or runtime already changed |
| Read/export permissions                 | Current permission catalog has no `audit.read` or `audit.export`                                               | Backend child must add both through existing RBAC; no role-code bypass or self-only mode                    |
| Read API/OpenAPI                        | No audit router/controller/read repository/module YAML found                                                   | Add approved list/detail/CSV operations only                                                                |
| CMS UI                                  | No audit source under `apps/cms/src`                                                                           | Add approved read-only list/detail/filter/search/pagination/export experience after API                     |
| Event projection/catalog                | Existing writers have machine types but no reader catalog                                                      | Expose only approved CMS mutations and `audit.exported`; keep auth and unknown types hidden                 |
| CMS write policy                        | Current category, role, user, and profile events use transactional `recordRequired`                            | Convert only approved CMS mutation events to post-commit best-effort with sanitized Pino evidence           |
| Durable retry                           | No outbox/retry exists                                                                                         | Accepted for phase 1; missing rows may be unreconstructable and no completeness claim is allowed            |
| Scheduled retention                     | Generic cleanup is unscheduled and fixed at 90 days; no auth cleanup implementation exists                     | Add one-year daily bounded permanent purge for both tables, with no archive/legal hold                      |
| Export                                  | No export API/UI exists                                                                                        | Add permission-gated UTF-8 CSV with approved 10,000-row and 31-day bounds plus best-effort `audit.exported` |
| Tenant/impersonation/service/bulk model | No approved domain/schema model exists                                                                         | Remain out of scope; add no inferred fields or controls                                                     |
| Actor snapshots                         | Current generic schema depends on nullable `actor_user_id` and has no snapshot fields                          | Add event-time actor ID/display name/email storage; do not fabricate legacy backfill                        |
| Change snapshots                        | Current CMS CRUD events mostly store no before/after metadata                                                  | Add event-specific changed-field before/after allowlists; legacy rows show unavailable state                |
| Database-enforced immutability claim    | Application repository has no update method, but deployment DB-role privilege model is not documented as proof | May claim application append-only only; stronger claim remains out of scope                                 |

## Existing generic event use discovered

Current source includes generic audit writes for at least:

- `category.created`, `category.updated`, `category.deleted`
- Role mutation events owned by role module
- User mutation events owned by user module
- `user.profile_updated`
- `auth.password_change.completed`, `auth.password_change.failed`
- `auth.password_reset.requested`, `auth.password_reset.completed`
- `auth.email_verification.requested`, challenge creation, `auth.email_verified`, and delivery-queued informational event

This list is discovery evidence. Approved reader catalog and labels are now fixed in `approved-requirements.md`; Backend must map current emitters to those decision IDs before claiming completeness.

## Consistency result

CONSISTENT: current source, completed `be/14`, `docs/DATABASE.md`, and `docs/SECURITY.md` agree that generic `audit_events` is separate from `auth_audit_events`, generic data is append-only through application boundaries, metadata is bounded/secret-free, and public reads require backend RBAC. Saputra's approved reader preserves these boundaries.

CONFLICT: current CMS mutation writers fail closed inside owner transactions, while approved `WRITE-001` requires only those ten CMS event types to become post-commit best-effort. Authority winner: Saputra's task-specific approval. Safe continuation: change only approved CMS emitters and preserve auth behavior.

CONFLICT: current cleanup is an unscheduled 90-day generic baseline with no auth cleanup, while approved `RETENTION-001` requires one-year scheduled purge for both tables. Authority winner: Saputra's task-specific approval. Safe continuation: retention child adds bounded independent cleanup without rewriting applied migrations or merging stores.

CONFLICT: durable product docs remain unresolved while task-specific requirements are approved. Authority winner for `be/41` implementation: Saputra's named approval in `approved-requirements.md`. Safe continuation: treat that artifact as task contract, but do not claim project docs or runtime already implement it.

## Planning constraints

- Preserve `be/14` and applied migrations.
- Add no production change in planning task.
- Record approved decisions durably under `tasks/be/41-audit-trail/references/`.
- Split implementation by API/access, emitter reconciliation, retention operations, UI, review, and QA.
- Serialize or explicitly divide ownership when child tasks touch `modules/audit/services/audit.service.ts`, schema, or global OpenAPI aggregation.
