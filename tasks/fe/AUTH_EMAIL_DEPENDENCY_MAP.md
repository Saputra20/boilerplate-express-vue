# CMS Auth and Email Frontend Dependency Map

This map consolidates current source evidence for `fe/21`–`fe/24`. Implementation claims reflect cited source/tests/task evidence; FE-24 browser visual verification remains pending.

## Combined State / Flow Model

```text
Unauthenticated
  ├─ Login (/login)
  │    └─ POST /api/v1/auth/login → tokens → CMS hydrates GET /api/v1/me
  │         ├─ `/api/v1/me` reads the database-backed requirement
  │         └─ mustChangePassword=true
  │              └─ API returns 403 password_change_required except `/me`, change-password, and logout
  │                   └─ FE routes to `/change-password`; after API 204 it reloads `/me` before resuming saved navigation
  ├─ Forgot password (/forgot-password)
  │    └─ POST /api/v1/auth/password-reset/request → generic 202 confirmation
  │         └─ email → /reset-password?token=…
  │              └─ POST /api/v1/auth/password-reset/confirm {token,password}
  │                   └─ 204; flag cleared and all active sessions revoked → sign in
  └─ Verification email
       └─ /verify-email?token=… → POST /api/v1/auth/email-verification/verify {token}
            ├─ 200 verified → success/sign-in action (no authentication)
            ├─ expired-specific error
            └─ invalid/used/revoked generic error
                 └─ optional resend: POST /api/v1/auth/email-verification/request {email}
                    → generic 202
```

## Dependency Table

| Frontend area      | Current source of truth                                                      | FE task relationship                                                           | Status / constraint                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Login              | `POST /api/v1/auth/login`; `LoginView.vue`; auth store hydrates `/api/v1/me` | Prerequisite for forgot/reset/verification navigation and first-login          | Optional login flag is parsed; `/me` hydrates the canonical auth identity                                                        |
| Auth Store         | `apps/cms/src/stores/auth.ts`                                                | FE-21/22/23 preserve session; FE-24 consumes backend identity and password API | Identity carries `/me` requirement; refresh token is in sessionStorage; access token is in memory                                |
| Session Bootstrap  | `restore()` → refresh → `/api/v1/me`                                         | Auth route gating and first-login flow                                         | Refresh remains token-only; `/me` rehydrates database-backed `user.mustChangePassword` before route decision                     |
| `/api/v1/me`       | `apps/api/src/modules/me/v1/me.openapi.yaml`; context service/repository     | Authenticated identity and first-login requirement                             | `user.id`, `user.email`, `user.mustChangePassword`, `roles`, `permissions`; no email verification state                          |
| Router Guards      | `apps/cms/src/router/index.ts`                                               | FE-21–23 public routes; FE-24 mandatory change route                           | Guard waits for restore, gates protected routes, preserves sanitized return target, and avoids mandatory-route loops             |
| Backend Login/Auth | Login service, auth OpenAPI, access-auth middleware                          | Required for FE-24 flag semantics                                              | Login includes optional top-level true only; refresh stays token-only; `/me` and each access-auth request read the database flag |
| Email Verification | BE-34 source/OpenAPI/tests; be-37 validation                                 | FE-23                                                                          | `POST /email-verification/verify` token→200; request/resend returns generic 202; token TTL 24h; 20 verify attempts/IP/15m        |
| Password Recovery  | BE-35 source/OpenAPI/tests; be-37 validation                                 | FE-21 and FE-22                                                                | Request generic 202; confirm token+password→204; TTL 1h; invalid/expired/used combined error; all active sessions revoked        |
| TailAdmin Auth UI  | FE-13 and existing login/primitives                                          | FE-21–24 use shared auth layout and password primitive                         | One consistent layout; FE-24 visual verification remains pending                                                                 |
| Frontend tests     | Vitest, jsdom, Vue Test Utils                                                | Each FE task                                                                   | No new testing framework                                                                                                         |

## Backend Dependency Status

| Backend task                                      | Implementation | Validation evidence                                                                                              | Frontend contract                                                                                                |
| ------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `be/10-login-session`                             | COMPLETE       | Login/OpenAPI/tests present; later be-37 auth HTTP/OpenAPI validation recorded PASS                              | Login may return `mustChangePassword: true`; FE preserves the optional value while `/me` remains canonical       |
| `be/25-authenticated-rbac-context`                | COMPLETE       | `/me` tests/OpenAPI present; be-37 OpenAPI validation PASS; extended by BE-38                                    | Base context now includes BE-38's database-backed `user.mustChangePassword`; email verification remains excluded |
| `be/34-email-verification`                        | COMPLETE       | `be/37-auth-email-quality-gate` records integration, HTTP/OpenAPI, full API and security checks PASS             | Request/verify endpoints and URL are usable by FE                                                                |
| `be/35-password-recovery`                         | COMPLETE       | `be/37-auth-email-quality-gate` records PostgreSQL integration, HTTP/OpenAPI, full API and security checks PASS  | Request/confirm endpoints and reset semantics are usable by FE                                                   |
| `be/37-auth-email-quality-gate`                   | COMPLETE       | Its evidence records integrated API suite, OpenAPI, migration/integration, lint/typecheck and Anti-Slop PASS     | Consolidated backend chain validated                                                                             |
| `be/38-authenticated-first-login-password-change` | COMPLETE       | Full API suite and isolated PostgreSQL transaction/concurrency/rollback tests PASS; see BE-38 execution evidence | Unblocks FE-24 with `/me`, authenticated change endpoint, and server enforcement                                 |

## Verified API Map

| User action                 | API operation                                  | Body → result/state                                                                                                                                                                       |
| --------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request password recovery   | `POST /api/v1/auth/password-reset/request`     | `{ email }` → `202` generic copy for all eligibility/delivery states; IP limit `429`; 5/hour per normalized address and 60-second account cooldown remain hidden as generic `202`         |
| Confirm password reset      | `POST /api/v1/auth/password-reset/confirm`     | `{ token, password }` → `204`; `400 invalid_or_expired_password_reset_token` covers invalid, expired, revoked, used; `429` on 20 attempts/IP/15m                                          |
| Verify email                | `POST /api/v1/auth/email-verification/verify`  | `{ token }` → `200 { message: "Email verified" }`; `verification_token_expired` is distinct; invalid/used/revoked share `invalid_or_used_verification_token`; `429` on 20 attempts/IP/15m |
| Request/resend verification | `POST /api/v1/auth/email-verification/request` | `{ email }` → generic `202`; IP `429`; account limit/cooldown stays generic                                                                                                               |
| First login required change | `POST /api/v1/auth/change-password`            | Bearer token + strict `{ currentPassword, newPassword }` → `204`; keep current session, revoke others; password reset remains a separate public challenge operation                       |

## Email URL / CMS Route Compatibility

- Verification builder uses `buildAuthActionUrl(PUBLIC_APP_URL, 'verify-email', token)` → `<PUBLIC_APP_URL>/verify-email?token=<encoded token>`.
- Reset builder uses `buildAuthActionUrl(PUBLIC_APP_URL, 'reset-password', token)` → `<PUBLIC_APP_URL>/reset-password?token=<encoded token>`.
- Current CMS route names should match suffixes `/verify-email` and `/reset-password`; tokens belong in query parameter `token`.
- Backend URL construction preserves a path already present in `PUBLIC_APP_URL`. CMS Vite config currently leaves `base` at `/`, and router calls `createWebHistory()` with the Vite base. Root deployment is compatible. If a path-prefixed URL is supported, deploy CMS with the same Vite/history base. The deployment contract has not established path-prefix support; implementation task must resolve if that deployment is required.
- Both token query values reach the static host/CDN on the initial document request before Vue can scrub browser history. FE-22/23 require an early no-referrer policy and deployment access-log query redaction for their routes. Confirm host/CDN behavior before production; client code cannot redact a request already received.

## State Model Limits

- Verification changes `users.emailVerifiedAt` only; current login eligibility and `/api/v1/me` do not expose verification state. Verification must not be treated as authentication.
- Reset changes password, clears `mustChangePassword`, and revokes every active session and refresh token transactionally. CMS should return user to login and must not imply session continuity.
- Login emits optional `mustChangePassword: true`, preserved by the frontend login schema; refresh remains token-only. Frontend auth identity uses the current database flag from `/api/v1/me`, and the guard sends required-change users to `/change-password`. FE-24 waits for fresh `/me === false` before resuming protected navigation. Backend middleware enforces the API restriction independently.

## Documentation Consistency Findings

- **CONFLICT — be/34 acceptance checkbox for recipient-address at-rest policy remains unchecked; authority winner: current migration/source and be/37 recorded integration evidence; safe continuation: FE-23 can rely on the tested API contract, while the backend owner should reconcile task-34’s stale checkbox before treating its task checklist as fully closed.** be/37 records migration 0018 recipient encryption/backfill and integration validation; verification paths, request/verify responses, link, TTL and limits match source/OpenAPI/tests.
- **CONSISTENT — be/35 password reset route, request/confirm bodies, `204`, one-hour TTL, token error, password rule and all-session revocation; authority winner: implementation/OpenAPI plus be/37 execution evidence.** No FE-side contract expansion is needed.
- **CONSISTENT — `/api/v1/me` returns user identity and database-backed `mustChangePassword`, plus roles and permissions; authority winner: active service/repository/OpenAPI/tests.** Email verification remains excluded.
- **CONSISTENT — BE-38 runtime, OpenAPI, and isolated PostgreSQL transaction/rollback/concurrency evidence implement the approved backend contract; authority winner: source, API tests, and OpenAPI validation.** FE-24 consumes the endpoint and identity contract without backend changes.
- `docs/DESIGN.md` retains a TODO for visual brand/breakpoint/accessibility decisions, while `tasks/fe/13-tailadmin-ui-foundation` and `tasks/fe/18-tailadmin-visual-rework` name TailAdmin as approved visual reference. These auth pages must follow the task-level TailAdmin contract; do not add new design tokens or invent a brand direction.

## Planned Task Order

1. `fe/21-forgot-password`: creates/reuses common auth layout and integrates password-reset request; preserves login behavior.
2. `fe/22-reset-password`: consumes reset email URL and depends on FE-21 shared layout.
3. `fe/23-verify-email`: consumes verification email URL and depends on FE-21 shared layout.
4. `fe/24-first-login-change-password`: consumes completed BE-38. Frontend behavior and automated checks pass; authenticated desktop/mobile visual verification remains pending.
