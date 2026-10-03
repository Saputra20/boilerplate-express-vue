# Audit Trail Approved Requirements

Approval date: 2026-10-02

Approver: Saputra, project owner/requester

Approval source: Kanban task `t_1e30e289` comment thread. Saputra's final instruction states that the combined decision set is complete. This artifact consolidates previously proposed details plus Saputra's corrections; later comments supersede earlier proposals where they conflict.

Implementation status: requirements approved; production behavior remains unchanged until implementation children complete and pass review.

## Decision register

| Decision ID     | Approved value                                                                                                                                                                                                                                                        | Approver                         | Date       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------- |
| `SCOPE-001`     | Audit Trail reader covers approved CMS data mutations in generic `audit_events` only. It does not aggregate or expose `auth_audit_events` or generic auth, password, or email-verification events.                                                                    | Saputra, project owner/requester | 2026-10-02 |
| `ACCESS-001`    | `audit.read` is required for global list and detail access. There is no self-only mode and no role-code bypass. Backend RBAC is authoritative; CMS guards and menu visibility are UX only.                                                                            | Saputra, project owner/requester | 2026-10-02 |
| `ACCESS-002`    | CSV export requires both `audit.read` and separate `audit.export`. Any persisted role may receive these permissions through existing RBAC assignment. No role name grants access by itself.                                                                           | Saputra, project owner/requester | 2026-10-02 |
| `CATALOG-001`   | Visible CMS catalog contains category, role, managed-user, and self-profile mutation events listed below. Unknown or auth-related event types are hidden from list, detail, search, filters, and export.                                                              | Saputra, project owner/requester | 2026-10-02 |
| `CATALOG-002`   | Successful CSV export attempts a best-effort `audit.exported` append. Future CMS modules must define and approve relevant create, update, and delete events before they become visible. No wildcard catalog entry is allowed.                                         | Saputra, project owner/requester | 2026-10-02 |
| `ACTOR-001`     | New rows preserve immutable event-time actor ID, display name, and email. Viewer behavior must not depend on a live `users` row. Actor types are `user` and `system` only.                                                                                            | Saputra, project owner/requester | 2026-10-02 |
| `CHANGE-001`    | New mutation events store allowlisted `before` and `after` values for fields that actually changed. Create uses `before: null`; delete uses `after: null`.                                                                                                            | Saputra, project owner/requester | 2026-10-02 |
| `REDACTION-001` | Credentials and sensitive material are always prohibited recursively. Raw entity, request, response, header, and metadata payloads are not exposed. Current 8 KiB metadata bound remains.                                                                             | Saputra, project owner/requester | 2026-10-02 |
| `READ-001`      | Feature provides read-only list, dedicated detail, and CSV export. No audit create, update, or selected-row delete API or UI exists.                                                                                                                                  | Saputra, project owner/requester | 2026-10-02 |
| `QUERY-001`     | List supports approved date, actor, action, resource, and outcome filters plus actor/target search. Default page size is 20 and hard maximum is 100. Exact query rules are below.                                                                                     | Saputra, project owner/requester | 2026-10-02 |
| `EXPORT-001`    | Export is UTF-8 CSV, applies approved filters and redaction, allows at most 10,000 rows and a 31-day range, and records a best-effort `audit.exported` event without file content.                                                                                    | Saputra, project owner/requester | 2026-10-02 |
| `TIME-001`      | Database persistence and API timestamps remain UTC. Human-facing CMS and CSV timestamps use `Asia/Jakarta` and are explicitly labelled `WIB (UTC+07:00)`.                                                                                                             | Saputra, project owner/requester | 2026-10-02 |
| `WRITE-001`     | Approved CMS mutation and export audit writes are best-effort. Their owning operation may succeed when audit persistence fails. One structured sanitized Pino error is mandatory; no external metric, alert backend, outbox, or durable retry is required in phase 1. | Saputra, project owner/requester | 2026-10-02 |
| `RISK-001`      | Phase 1 explicitly accepts that a successful CMS mutation or export can have no durable audit row and cannot later be reconstructed. The feature must not claim complete or non-repudiable history.                                                                   | Saputra, project owner/requester | 2026-10-02 |
| `RETENTION-001` | Both `audit_events` and `auth_audit_events` retain rows for one year, then permanently purge older rows. No archive or legal hold exists in phase 1. Exact execution contract is below.                                                                               | Saputra, project owner/requester | 2026-10-02 |
| `DOMAIN-001`    | Tenant, impersonation, service-account, and bulk-action models are not applicable to current scope. Add no inferred columns, filters, selectors, or semantics for them.                                                                                               | Saputra, project owner/requester | 2026-10-02 |
| `LEGACY-001`    | Historical rows are not fabricated or backfilled. Missing actor snapshots render `Actor unavailable`; missing change snapshots render `Change details unavailable`. Existing stable resource type/ID may still be shown.                                              | Saputra, project owner/requester | 2026-10-02 |

## Scope boundary

`SCOPE-001` applies these rules:

1. Read from generic `audit_events` only.
2. Return only event types in `CATALOG-001` and `CATALOG-002`.
3. Do not read, join, migrate, merge, or expose `auth_audit_events` through this feature.
4. Keep existing generic auth/password/email-verification rows and all current auth emitters under their existing storage and failure behavior. They remain invisible to this reader.
5. Keep application history append-only. Retention is the only approved destructive operation and has no public HTTP or CMS control.

## Approved event catalog

All rows below have outcome `success`, one-year retention, global visibility under `audit.read`, and best-effort persistence under `WRITE-001`. Rejected requests, validation failures, and failed owner operations do not create these success events. Existing owner semantics determine whether an accepted no-op update is treated as a successful update; this task does not change that business behavior.

| Event type             | Display label        | Trigger                                                                           | Actor                         | Resource                            | Change profile      | Owning module         |
| ---------------------- | -------------------- | --------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------- | ------------------- | --------------------- |
| `category.created`     | Category created     | Category is committed                                                             | Trusted current user snapshot | `category` plus created category ID | Category create     | Category              |
| `category.updated`     | Category updated     | Approved category update succeeds under existing owner semantics                  | Trusted current user snapshot | `category` plus category ID         | Category update     | Category              |
| `category.deleted`     | Category deleted     | Category deletion or approved soft deletion is committed                          | Trusted current user snapshot | `category` plus category ID         | Category delete     | Category              |
| `role.created`         | Role created         | Role and approved permission assignment are committed                             | Trusted current user snapshot | `role` plus created role ID         | Role create         | Role                  |
| `role.updated`         | Role updated         | Approved role update succeeds under existing owner semantics                      | Trusted current user snapshot | `role` plus role ID                 | Role update         | Role                  |
| `role.deleted`         | Role deleted         | Role deletion is committed                                                        | Trusted current user snapshot | `role` plus role ID                 | Role delete         | Role                  |
| `user.created`         | User created         | Managed user and approved role assignment are committed                           | Trusted current user snapshot | `user` plus created user ID         | Managed-user create | User management       |
| `user.updated`         | User updated         | Approved managed-user update succeeds under existing owner semantics              | Trusted current user snapshot | `user` plus managed user ID         | Managed-user update | User management       |
| `user.deleted`         | User deleted         | Managed-user soft deletion is committed                                           | Trusted current user snapshot | `user` plus managed user ID         | Managed-user delete | User management       |
| `user.profile_updated` | Profile updated      | Current user's approved profile field is committed with an effective value change | Trusted current user snapshot | `user` plus current user ID         | Self-profile update | Authenticated profile |
| `audit.exported`       | Audit trail exported | Approved CSV rows have been selected and export generation succeeds               | Trusted current user snapshot | No single target resource           | Export summary      | Audit                 |

Catalog rules:

- Existing auth event types remain stored but invisible, including every `auth.*` row in either audit table.
- Detail lookup by ID must not reveal a hidden or unknown event. After successful authentication and authorization, use the same not-found response as an absent visible row.
- Unknown future machine types remain invisible until a named human approves their label, trigger, projection, metadata, write policy, and retention.
- Future CMS modules define their own relevant create, update, and delete events. They do not inherit public visibility through a wildcard.
- `audit.exported` is visible in subsequent list, detail, search, and export results when it falls within the selected range.

## Actor and target identity

### User actor

Each new approved event stores an immutable event-time snapshot containing:

- stable user ID;
- nullable display name;
- email address.

The stable snapshot ID must survive deletion independently of the existing nullable `actor_user_id` foreign key. Display name and email are approved historical PII. They may appear in authorized list, detail, search, and export output and are permanently removed with the event under `RETENTION-001`.

The backend derives all snapshot values from trusted server-side identity data in the owning operation. Browser input cannot provide or override them.

### System actor

A system event has `actorType: system`, no user ID, no display name, and no email. It renders as `System`. Current approved catalog triggers are user-driven; system remains the only approved non-user actor type for future separately approved automated events.

### Legacy actor

Do not backfill actor snapshots from mutable current user data. A pre-migration row without the full approved snapshot renders `Actor unavailable`, even when a current user lookup could supply a name or email.

### Target

Target identity uses stored `resourceType` and stable `resourceId`. It never requires the source row to remain present. A deleted target still renders its resource type and ID; an approved delete snapshot may show prior values. A legacy row without change values renders `Change details unavailable` and must not query a live entity to fabricate history.

## Change metadata contract

All new approved mutation events use this shape:

```json
{
  "before": null,
  "after": null
}
```

The actual values follow these rules:

- Create: `before` is `null`; `after` contains approved created fields.
- Update: `before` and `after` contain the same keys and only fields whose effective persisted values differ. Null transitions are retained. If an existing owner operation treats an accepted no-op as successful, its event may contain empty `before` and `after` objects; this task does not redefine that operation's business semantics.
- Delete: `before` contains approved last persisted fields; `after` is `null`.
- Arrays that represent sets, such as permission codes, use deterministic ordering before comparison and persistence.
- Metadata remains explicit, JSON-safe, recursively redacted, and at most 8 KiB in UTF-8 serialized form.
- Never store a full entity or raw request/response object.

Approved field allowlists:

| Change profile | Allowed fields                                   |
| -------------- | ------------------------------------------------ |
| Category       | `name`, `slug`, `description`, `isActive`        |
| Role           | `code`, `name`, `description`, `permissionCodes` |
| Managed user   | `email`, `roleId`, `status`                      |
| Self-profile   | `displayName`                                    |

Managed-user email and actor email are approved historical PII, not credentials. Their use is limited to this permission-gated feature and the one-year retention period.

Password values, password hashes, tokens, token hashes or fingerprints, secrets, credentials, cookies, authorization headers, private keys, connection strings, raw headers, raw request or response bodies, exception stacks, and equivalent sensitive material are prohibited at every nesting level. Auth/password/email-verification events remain outside this reader regardless of metadata safety.

## Access and authorization

### List and detail

- Both operations require authenticated access plus backend permission `audit.read`.
- Access is global over the approved event catalog. No self-only mode exists.
- No hard-coded role, admin flag, JWT role snapshot, or CMS guard grants access.
- Persisted RBAC assignment is the only authorization source. Existing admin all-catalog seeding may grant the new permission through its established mechanism; custom roles receive it only through explicit persisted assignment.

### Export

- Export requires authenticated access plus both `audit.read` and `audit.export`.
- `audit.export` alone does not grant list, detail, or export access.
- CMS menu/button guards only reflect backend permissions and are not a security boundary.

## Read API and CMS scope

Approved API operations:

- `GET /api/v1/audit-events`
- `GET /api/v1/audit-events/:id`
- `GET /api/v1/audit-events/export`

Approved CMS routes and navigation:

- `/audit-trail`
- `/audit-trail/:id`
- navigation label: `Audit Trail`

No POST, PUT, PATCH, selected-row DELETE, restore, edit, or replay operation is approved.

### List projection

Each list item contains only:

- `id`;
- `eventType`;
- approved `label`;
- `actor` with `type: user|system`, `available`, and nullable `id`, `displayName`, and `email`;
- `resource` with nullable `type` and `id` (`audit.exported` has no single resource);
- `outcome`;
- `createdAt` as UTC ISO-8601.

For a new user event, `actor.available` is `true` and the approved snapshot fields are returned. For a system event, availability is `true` and identity fields are null. For a legacy row without the full approved snapshot, availability is `false`, identity fields are null, and UI renders `Actor unavailable`.

### Detail projection

Detail contains the list projection plus:

- nullable `requestId`;
- `changes` with `available`, nullable `before`, and nullable `after`, projected through the exact event allowlist above;
- for `audit.exported` only, `exportSummary` containing `rowCount`, normalized date bounds and exact filters, and `searchApplied`, never raw `q` or file content.

A legacy mutation row without approved before/after data uses `changes.available: false`, null values, and UI renders `Change details unavailable`. `audit.exported` has no mutation changes; its detail uses the approved export summary.

Responses omit `sessionId`, IP address, user agent, reason code, raw metadata, unapproved metadata keys, source entity joins, headers, payloads, and all credential material.

## Query and pagination contract

List and export share the same catalog visibility, filter semantics, and search boundary.

| Input     | Rule                                                                                                                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date      | `from` and `to` are timezone-qualified ISO-8601 instants. If omitted, use the last 30 days ending at request time. List/detail browsing allows at most a 90-day submitted span. Export has its separate 31-day maximum. |
| Actor     | Exact event-time actor user ID. System events have no user ID.                                                                                                                                                          |
| Action    | Exact approved `eventType`. No wildcard or auth event type.                                                                                                                                                             |
| Resource  | Exact `resourceType` and optional exact `resourceId`.                                                                                                                                                                   |
| Outcome   | Exact `success` or `failure`; the current approved catalog emits `success`.                                                                                                                                             |
| Search    | `q` is trimmed, 2 to 120 characters, and case-insensitively searches actor snapshot display name plus target resource type and ID. Exact actor ID uses the Actor filter.                                                |
| Page size | `limit` defaults to 20 and accepts only 20, 50, or 100.                                                                                                                                                                 |
| Cursor    | Opaque cursor over `(createdAt DESC, id DESC)`. Invalid cursors receive a safe validation error.                                                                                                                        |

Ordering is newest first by `createdAt DESC`, then `id DESC`. Cursor boundaries must prevent omission or duplication when timestamps match. No user-selectable sort is approved.

Search does not inspect `before`, `after`, raw JSON metadata, IP address, user agent, request/session headers, payloads, or `auth_audit_events`.

## Export contract

- Format: UTF-8 CSV only.
- Authorization requires `audit.read` together with `audit.export`.
- Selection: same approved catalog, filters, search, and redaction as list/detail.
- Bounds: maximum 10,000 rows and maximum 31-day `from`/`to` span per request.
- Requests exceeding either bound are rejected; do not silently truncate.
- Delivery: synchronous streamed response with no server-side file retention and no async job in phase 1.
- Timestamp display: `Asia/Jakarta`, explicitly identified by CSV header or value context as `WIB (UTC+07:00)`.
- Text beginning with a spreadsheet formula trigger (`=`, `+`, `-`, `@`, tab, or carriage return) is prefixed with a single quote before RFC 4180 CSV escaping and serialization.
- Export columns are fixed to `id`, `eventType`, `label`, `actorType`, `actorId`, `actorDisplayName`, `actorEmail`, `resourceType`, `resourceId`, `outcome`, `occurredAtWib`, `requestId`, `changeDetailsAvailable`, `before`, and `after`.
- `before` and `after` serialize only allowlisted change objects as compact JSON text; unavailable values are empty and `changeDetailsAvailable` is `false`.
- No raw metadata, file content, file path, session ID, IP address, user agent, auth row, or hidden event is exported.

After rows are selected and CSV generation succeeds, attempt `audit.exported` with:

- actor snapshot under `ACTOR-001`;
- `rowCount`;
- sanitized filter summary containing normalized date bounds and any exact action, actor ID, resource type/ID, and outcome filters;
- `searchApplied: true|false` instead of raw free-text `q`;
- no CSV content, filename, filesystem path, response body, or raw search text.

`audit.exported` is best-effort. Its persistence failure emits the sanitized Pino evidence required by `WRITE-001` but does not fail an otherwise successful export. This accepted gap is covered by `RISK-001`.

## Write-failure policy

| Event class                                             | Policy                                | Owner operation when audit fails | Failure evidence                    | Durable retry   |
| ------------------------------------------------------- | ------------------------------------- | -------------------------------- | ----------------------------------- | --------------- |
| Ten approved CMS mutation types                         | Best-effort after owner state commits | Remains successful               | One structured sanitized Pino error | None in phase 1 |
| `audit.exported`                                        | Best-effort                           | Export remains successful        | One structured sanitized Pino error | None in phase 1 |
| Existing generic auth/password/email-verification types | Preserve current per-emitter behavior | Unchanged                        | Unchanged                           | Unchanged       |
| Existing `auth_audit_events` types                      | Preserve current auth owner behavior  | Unchanged                        | Unchanged                           | Unchanged       |

The Pino error may contain only bounded operational identifiers needed to diagnose loss, such as event type and request ID. It must not contain metadata, before/after values, actor email/display name, raw filters, CSV content, credentials, headers, payloads, or exception stacks.

Implementation must deliberately move only the ten approved CMS mutation event writes away from current transactional `recordRequired` behavior. State commits first; audit append then runs best-effort. Existing auth/security writers are not converted.

No metric backend, external alert destination, outbox, queue, dead-letter store, or replay mechanism is required in phase 1. Pino evidence is the approved signal. Missing history cannot be reconstructed, and product/security claims must state that limitation.

## Retention and purge contract

`RETENTION-001` applies independently to both `audit_events` and `auth_audit_events`:

- Retention duration: one calendar year.
- Eligibility boundary: permanently delete only rows with `createdAt < current run instant - interval '1 year'`. Equality is retained until a later run.
- Schedule: daily at 02:00 in `Asia/Jakarta`.
- Batch size: at most 1,000 rows per delete batch per table.
- Run bound: 30 seconds maximum for the whole scheduled run across both tables.
- Processing: use deterministic oldest-first bounded batches and stop when both tables have no eligible row or the run bound is reached.
- Failure: keep already committed batches, emit one structured sanitized Pino operational error, stop the failed run safely, and retry remaining eligible rows on the next daily schedule.
- Interface: internal scheduled maintenance only. No public HTTP endpoint, CMS control, selected-row purge, user-supplied cutoff, or shared/production purge during tests.
- Archive: none in phase 1.
- Legal hold: none in phase 1.
- Deletion: permanent and irreversible once a batch commits.
- Scope separation: process each table through its own repository/storage contract; do not merge or expose auth history.
- Concurrency: only one retention run may execute at a time. If the existing queue/scheduler delivers a duplicate while one run is active, it must not start a second deletion loop.
- Operational ownership: backend/API operations responsible for the deployed scheduler and Pino operational logs.

Tests must use a controllable clock and disposable isolated database. They must prove strict boundary equality, both-table coverage, 1,000-row batching, single-run concurrency, the 30-second stop condition, next-schedule recovery, and no unrelated deletion.

## Time handling

- PostgreSQL `timestamptz` and API values remain UTC source of truth.
- API `createdAt` uses UTC ISO-8601.
- CMS converts to `Asia/Jakarta` and labels displayed time `WIB (UTC+07:00)`.
- CSV uses `Asia/Jakarta` with explicit `WIB (UTC+07:00)` context.
- Filtering compares normalized instants, not locale-formatted strings.
- Retention scheduling uses `Asia/Jakarta`; the persisted cutoff comparison remains against UTC instants.

## Unsupported concepts

Phase 1 adds no tenant, organization, impersonator, effective-user, service-account, or bulk-operation field or filter. Current actor types remain only `user` and `system`. A future domain model requires a separate approved contract and migration before it can affect audit behavior.

## Legacy and rollout rules

- Do not fabricate or backfill event-time actor name/email or `before`/`after` values from current mutable tables.
- Existing approved machine types may be listed, but absent snapshots use the unavailable markers in `LEGACY-001`.
- Auth and unknown types remain hidden even when their rows predate this feature.
- Focused actor-snapshot schema changes require Drizzle UP, matching DOWN, and isolated UP/DOWN/re-apply evidence.
- Permission/API and safe projection must land before CMS navigation becomes available.
- Existing applied migrations and completed `be/14-audit-trail` remain immutable.
- No implementation may claim complete, tamper-proof, WORM, legally compliant, or non-repudiable audit history.

## Consistency and authority

`CONSISTENT`: approved append-only/read-only behavior, explicit metadata allowlists, recursive credential redaction, backend RBAC, UTC persistence, and separate auth storage agree with `AGENTS.md`, `docs/SECURITY.md`, `docs/DATABASE.md`, and completed `be/14-audit-trail`.

`CONFLICT`: current category, role, managed-user, and profile emitters use transactional `recordRequired`; `WRITE-001` approves best-effort post-commit behavior for those ten CMS event types. Authority winner: Saputra's task-specific human approval recorded here. Safe continuation: implementation changes only those approved emitters and preserves auth behavior.

`CONFLICT`: current generic cleanup uses an unscheduled 90-day baseline and no auth cleanup implementation exists; `RETENTION-001` approves scheduled one-year retention for both tables. Authority winner: Saputra's task-specific human approval recorded here. Safe continuation: retention child adds focused bounded operations without rewriting applied migrations or merging tables.

`CONSISTENT WITH DEFERRED SOURCE UPDATE`: `docs/PRD.md`, `docs/PRODUCT.md`, and `docs/DOMAIN.md` do not yet carry this product contract. This named approval artifact is task authority for `be/41-audit-trail`; production source and durable project docs remain unchanged until their owning implementation/documentation work is reviewed.

## Open points

None for approved phase 1 scope. Any capability outside this artifact, including new event types, auth-history viewing, tenant or impersonation support, durable retry, external alerting, archive, legal hold, asynchronous export, alternate format, or stronger tamper-resistance claims, requires separate named human approval.
