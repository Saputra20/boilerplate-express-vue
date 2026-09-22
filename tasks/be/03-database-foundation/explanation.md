# be/03-database-foundation — Database Foundation

## Tujuan

Create typed PostgreSQL/Drizzle connection lifecycle and migration boundary from separated database configuration; do not introduce business tables.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Create typed PostgreSQL/Drizzle connection lifecycle and migration boundary from separated database configuration; do not introduce business tables.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

be/02-environment-validation

## Risiko / Hal yang Perlu Diperhatikan

Exact production migration deployment procedure is not specified.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Create typed PostgreSQL/Drizzle connection lifecycle and migration boundary from separated database configuration; do not introduce business tables.

## Task Berikutnya

be/04-identity-schema
