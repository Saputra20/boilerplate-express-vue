# be/32-email-template-foundation — Transactional Email Templates

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/32-email-template-foundation` |
| Batch | Authentication email infrastructure |
| Owning Feature | Transactional email |
| Workstream | Backend |
| Task Category | Shared transactional-email rendering |
| Repository/App | `apps/api` |
| Status | Planned — requires human approval before implementation |
| Priority | High |
| Suggested Size | Small |
| Depends On | `be/31-email-foundation`, `be/21-api-module-architecture-refactor` |
| Blocks | `be/33-email-queue-worker`, `be/34-email-verification`, `be/35-password-recovery` |
| Execution Order | 32 |

## 2. Outcome

Provide typed, reusable transactional-email renderers producing subject, preheader, HTML, and plain text without inline HTML in Auth services.

## 3. Context

No email rendering exists. `modules/` owns business capabilities, while SMTP stays infrastructure. Auth requires future verification/reset messages.

## 4. Dependencies

Requires the approved send-message contract from task 31. Brand/product/support content and a logo asset are not present in source.

## 5. In Scope

- Create a focused notification/email module under `src/modules/notification/`, not a global utility folder.
- Base layout and typed renderers for verification and password-reset messages.
- Optional password-changed confirmation only after approval.
- Safe URL assembly and render/snapshot tests.

## 6. Out of Scope

SMTP transport, queues, Auth APIs, persistence, marketing mail, localization implementation, production preview endpoint, and arbitrary HTML template variables.

## 7. Existing Implementation

Inspect no existing templates/brand assets before implementation. Reuse `config/email` transport contract; do not duplicate it.

## 8. Implementation Requirements

- The notification module owns template definitions/rendering; Auth supplies typed business data, never HTML.
- Each template returns `{ subject, previewText, html, text }`; HTML and text must contain a CTA/fallback URL, expiry wording, and appropriate security notice.
- Escape all interpolated text and accept no arbitrary raw HTML. Template data has discriminated, template-specific TypeScript types.
- Base layout includes approved product identity, title, body, CTA, fallback URL, footer/support text, and responsive inline-safe styles compatible with common email clients.
- URLs must derive from approved public URL configuration; reject unsafe/relative targets. Design localization-ready template interfaces without adding locales.
- A local-only renderer/test preview may be planned after approval; never expose a public production preview route.

## 9. Applicable Contracts

### Configuration Contract

Uses approved sender/product/public URL values from task 31; no new configuration semantics.

### API / Database / UI Contracts

Not applicable — rendered email is not a public API/UI contract in this task.

## 10. File Impact

Expected create: `src/modules/notification/email/templates/**`, renderer/types/tests. Expected modify: module composition only if needed. No new top-level root, transport duplication, schema, migration, or HTTP route.

## 11. Runtime Behavior

Owning module selects a typed template → renderer validates data and builds both bodies → future queue worker passes rendered message to task-31 transport.

## 12. Error And Edge Cases

| Scenario | Expected result |
| --- | --- |
| Missing required data/unsafe URL | deterministic internal validation failure |
| Long URL/address | usable wrapped fallback in HTML and text |
| Unescaped user-provided text | escaped output; no injection |

## 13. Security Requirements

Never interpolate raw token values except in the approved final recipient URL; renderer tests, logs, and snapshots must use synthetic values. Do not include unnecessary PII.

## 14. Test Requirements

Render each template’s four outputs, variable validation/escaping, CTA/fallback equivalence, expiry/security text, responsive-safe markup, and synthetic snapshots. No SMTP send.

## 15. Task-Level Expected Results

Professional reusable messages exist with one shared layout and exact typed data boundaries.

## 16. Acceptance Criteria

- [ ] Verification/reset renderers yield subject, preview, HTML, and text.
- [ ] Auth services do not contain template HTML.
- [ ] Escaping, URLs, and required security copy are test-proven.

## 17. Anti-Slop Requirements

Code/Copy Anti-Slop: reject generic marketing content, fake support claims, raw HTML injection, duplicate layouts, unused template types, and hidden TODOs. UI/visual: manual email-client preview is planned, not claimed.

## 18. Validation Requirements

Format, lint, typecheck, renderer/snapshot tests, manual local preview when approved, full API tests, diff/secret review, Code and Copy Anti-Slop.

## 19. Completion Evidence

Renderer tests cover AC-1/3; source search covers AC-2; approved local preview captures desktop/mobile and plain-text evidence.

## 20. Traceability

Not applicable.

## 21. Open Points

Product name, logo/mark, support address, sender presentation, exact expiry copy, password-changed email, and preview workflow require approval.

## 22. Definition Of Done

Approved template copy/identity, typed rendering, test evidence, no secret/PII leakage, Anti-Slop, and static/diff checks pass.
