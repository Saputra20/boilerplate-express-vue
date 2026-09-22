# be/04-identity-schema — Identity Schema

## Tujuan

Model only documented identity entity families: users, roles, permissions, user_roles, and role_permissions; create migration-backed constraints only after unresolved semantics are approved.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Model only documented identity entity families: users, roles, permissions, user_roles, and role_permissions; create migration-backed constraints only after unresolved semantics are approved.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

be/03-database-foundation

## Risiko / Hal yang Perlu Diperhatikan

TODO: REQUIREMENT NEEDED — user identifier, credential fields, role vocabulary, permission catalog, retention, and deletion semantics.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Model only documented identity entity families: users, roles, permissions, user_roles, and role_permissions; create migration-backed constraints only after unresolved semantics are approved.

## Task Berikutnya

be/05-redis-foundation

Task ini tidak boleh dieksekusi sebelum Open Points diselesaikan.
