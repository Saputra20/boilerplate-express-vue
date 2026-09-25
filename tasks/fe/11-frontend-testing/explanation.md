# fe/11-frontend-testing — Frontend Testing

Task ini sekarang merepresentasikan bukti terfokus untuk fondasi CMS yang sudah ada, bukan pembuatan testing dari nol. Vitest, jsdom, Vue Test Utils, dan konfigurasi test sudah tersedia.

## Yang Sudah Ada
Test mencakup environment validation, shell dan mobile navigation, API client, auth/session, login, route guard, sanitasi `returnTo`, serta state error/unavailable/denied. Suite saat ini lulus 47 test dalam 7 file.

## Yang Berubah
Test yang sudah ada direkonsiliasi sebagai evidence untuk capability yang benar-benar tersedia. Auth restoration, refresh rotation, single-flight refresh, logout cleanup, safe redirect, transport error, dan state feedback memiliki proof terfokus.

## Yang Belum Dikerjakan
Test `can()`, permission-aware navigation, route denial, hydration, dan logout cleanup belum dibuat karena contract backend `be/25-authenticated-rbac-context` belum diimplementasikan dan `fe/09` belum memiliki boundary frontend yang disetujui. Fixture permission tidak boleh dipresentasikan sebagai integrasi backend. Browser-rendered verification juga belum dijalankan.

## Status
Status `Implemented — verification incomplete`: capability yang tersedia sudah memiliki test dan human review sudah lulus, tetapi dependency `be/25` → `fe/09` dan browser verification masih tersisa.

## Yang Tidak Berubah
Tidak ada perubahan pada aplikasi backend, API, dependency, permission authority, token policy, atau product navigation. Tidak ada credential nyata dalam fixture.

## Cara Mengecek
Jalankan `bun run --cwd apps/cms test`, `bun run --cwd apps/cms lint`, `bun run --cwd apps/cms typecheck`, `bun run --cwd apps/cms build`, lalu `git diff --check`. Browser verification harus dilaporkan `NOT RUN` bila renderer tidak tersedia.

## Review Manusia
Human review lulus untuk behavior test, bukan coverage theater, dan frontend tidak dianggap sebagai authorization authority. `fe/09` tetap harus menentukan contract permission sebelum test RBAC ditambahkan.
