# be/13-rbac-permissions — RBAC And Permissions

## Apa yang dibuat?

Task ini menyiapkan kontrak RBAC backend dengan alur `user → role → permission`. Backend menjadi sumber kebenaran untuk keputusan akses.

## Kenapa dibuat?

Role atau permission dari CMS, browser, atau isi JWT tidak boleh menjadi dasar keamanan. Backend harus membaca relasi RBAC yang tersimpan sebelum memberi akses.

## Apa yang berubah?

- Permission memakai kode mesin stabil dengan bentuk `resource.action`.
- Route yang nanti dilindungi harus menyatakan permission secara eksplisit.
- Default akses adalah ditolak.
- User yang sudah terautentikasi tetapi tidak memiliki permission mendapat `403`.
- Token tidak ada atau tidak valid tetap mendapat `401` dari middleware autentikasi.
- Banyak role digabung sebagai union permission.
- `admin` bukan bypass khusus; role itu mendapat `system.access` melalui relasi `role_permissions` biasa. Fixture `viewer` dengan `system.observe` hanya membuktikan union beberapa role.

## Apa yang tidak berubah?

Tidak ada route bisnis, API manajemen role, UI CMS, permission katalog bisnis, policy kepemilikan, atau row-level authorization. Login, refresh, dan logout tidak memerlukan permission RBAC tambahan.

## Dependency task apa?

`be/04-identity-schema` menyediakan tabel RBAC. `be/10-login-session` dan `be/12-logout-revocation` menyediakan identitas dan autentikasi access token yang valid.

## Risiko utama?

Permission yang tidak dideklarasikan atau tidak ada di database tidak boleh berubah menjadi allow. Hasilnya harus gagal aman. Role `admin` juga tidak boleh diberi bypass di kode.

## Bagaimana cara mengecek hasilnya?

Review test resolver dan middleware untuk grant, penolakan, union role, `401`, `403`, permission tidak dikenal, dan input role palsu dari client. Jalankan format, lint, typecheck, test, Code Anti-Slop, dan `git diff --check`.

## Apa yang harus direview manusia?

Pastikan permission bisnis baru hanya dibuat bersama modul bisnis pemiliknya. Pastikan policy ownership atau self-service tidak masuk diam-diam ke fondasi RBAC ini.

## Apa yang belum dikerjakan?

Katalog permission bisnis, role CRUD, UI CMS, row-level/ownership policy, multi-tenant authorization, cache permission, dan audit trail lengkap tetap task berikutnya.
