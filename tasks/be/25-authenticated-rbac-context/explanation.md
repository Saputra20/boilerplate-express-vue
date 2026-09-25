# be/25-authenticated-rbac-context — Authenticated RBAC Context

## Apa yang dibuat?
Backend menyediakan `GET /api/v1/me` untuk mengembalikan `user.id`, `user.email`, role codes, dan effective permission codes dari session authenticated.

## Kenapa dibuat?
CMS membutuhkan context ini untuk dynamic side-menu dan UX permission. Backend tetap menjadi sumber authorization; frontend hanya memakai data untuk visibility dan navigation.

## Apa yang berubah?
Auth module memiliki context service/repository, RBAC service dapat mengambil effective permissions, route `/api/v1/me` memakai bearer authentication, dan OpenAPI mendokumentasikan response serta security. Dokumentasi OpenAPI `/api/v1/me` dipisahkan ke `apps/api/src/modules/me/v1/me.openapi.yaml`; `auth.openapi.yaml` hanya berisi operasi auth.

## Apa yang tidak berubah?
Tidak ada role/permission CRUD, migration, JWT claim baru, admin bypass, resource authorization, permission cache, atau perubahan pada enforcement middleware.

## Dependency task apa?
Task memakai identity schema, login/session, logout/revocation, RBAC permission relations, dan versioned OpenAPI yang sudah tersedia.

## Risiko utama?
Response tidak boleh menjadi authorization authority atau membocorkan password, token, session secret, audit data, maupun join-table internals. Permission dihitung backend dari persisted relations.

## Bagaimana cara mengecek hasilnya?
Jalankan `bun run --cwd apps/api test`, `bun run --cwd apps/api typecheck`, `bun run --cwd apps/api lint`, `bun run --cwd apps/api format:check`, dan `git diff --check`. Test endpoint, service, RBAC union, split OpenAPI module, dan security sudah ditambahkan.

## Apa yang harus direview manusia?
Human approval sudah diberikan untuk `GET /api/v1/me`, user ID/email, roles, effective permissions, dan OpenAPI section terpisah. CMS harus memakai data ini hanya untuk dynamic menu dan UX, bukan enforcement.

## Apa yang belum dikerjakan?
Frontend `fe/09` masih perlu mengonsumsi endpoint ini melalui satu `can()` boundary dan menambahkan test RBAC UX. Backend role/permission management tetap di luar scope.
