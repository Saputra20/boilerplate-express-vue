# be/28-user-crud — Administrative User CRUD And Role Assignment

## Apa yang dibuat?

Kontrak eksekusi untuk administrasi user: list, detail, create, update, aktivasi/deaktivasi, delete sesuai retention policy, dan sinkronisasi role melalui `user_roles`.

## Kenapa dibuat?

User administration harus memakai identity dan authentication foundation yang sudah ada tanpa membuat model user kedua, membocorkan password, atau merusak session, revocation, RBAC, dan audit.

## Apa yang berubah?

Belum ada perubahan runtime. Dokumen ini menetapkan reuse schema user, Argon2id helper, auth-state rules, transactional role assignment, RBAC, audit, tests, dan completion evidence.

## Apa yang tidak berubah?

Tidak ada user model baru, profile fields baru, registration, password reset, auth redesign, JWT claim baru, dynamic role creation, atau CMS UI. Login, refresh, logout, dan revocation tetap dimiliki modul auth.

## Dependency task apa?

Task bergantung pada identity schema, password hashing, login/session, logout/revocation, RBAC, audit trail, OpenAPI, authenticated context, dan `be/27-role-crud`.

## Risiko utama?

Schema saat ini tidak memiliki `name`; status hanya `active`/`disabled`; soft-deleted users dipertahankan. Password create, status transition, delete/session invalidation, role assignment, permission catalog, dan audit fail-closed policy belum disetujui.

## Bagaimana cara mengecek hasilnya?

Setelah open points disetujui, jalankan focused user/auth-state/role transaction/audit tests, full API test, lint, typecheck, format check, OpenAPI validation, Code Anti-Slop, dan `git diff --check`.

## Apa yang harus direview manusia?

Setujui field editable, password lifecycle, status transitions, deletion retention, session invalidation, self/last-admin safeguards, role assignment semantics, administrative permissions, dan audit event policy.

## Apa yang belum dikerjakan?

Source module, route, repository, service, OpenAPI, tests, dan runtime composition belum dibuat. Status tetap blocked untuk execution sampai dependency dan open points disetujui.

