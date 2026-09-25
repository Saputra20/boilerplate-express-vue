# fe/09-permission-guard — RBAC UX Foundation / Permission Guard

Task ini sekarang memakai contract backend `GET /api/v1/me`. Response menyediakan user ID, email, role codes, dan effective permission codes untuk UX CMS.

## Yang Dibuat
- API client memanggil `/api/v1/me` dengan bearer access token.
- Auth store melakukan hydration saat login dan session restoration.
- `auth.can(permission)` menjadi satu-satunya permission-check boundary.
- Navigation item mendukung optional `permission` dan item denied disembunyikan.
- Route metadata mendukung `requiredPermission`.
- User authenticated tanpa permission diarahkan ke denied state, bukan login.
- Denied view menyediakan heading, pesan netral, dan link kembali ke Home.

## Batas Keamanan
Frontend permission state hanya mengatur UX. API tetap menjadi authorization authority. Tidak ada admin bypass, role-name shortcut, JWT permission inference, atau permission key produksi yang diciptakan.

## Status
Status `Implemented — verification incomplete`: test dan static checks lulus. Browser verification untuk denied state dan human review masih pending.

## Cara Mengecek
Jalankan `bun run --cwd apps/cms test`, `bun run --cwd apps/cms typecheck`, `bun run --cwd apps/cms lint`, `bun run --cwd apps/cms build`, dan `git diff --check`.

## Yang Tidak Berubah
Tidak ada backend source, API authorization policy, migration, dependency, role/permission catalog, atau business navigation yang ditambahkan. Fixture permission hanya dipakai untuk unit UX tests.

## Review Manusia
Review bahwa dynamic menu memakai role/permission response hanya untuk visibility, route denial tidak menggantikan API authorization, dan browser verification mencakup authenticated denied state.
