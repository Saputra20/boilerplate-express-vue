# be/07-security-foundation — Security Foundation

## Tujuan

Add baseline Helmet, CORS, rate limiting, request-size limit, safe centralized errors, request IDs, and graceful shutdown.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Add baseline Helmet, CORS, rate limiting, request-size limit, safe centralized errors, request IDs, and graceful shutdown.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

be/02-environment-validation, be/06-logging-foundation

## Risiko / Hal yang Perlu Diperhatikan

Rate-limit thresholds and expanded CORS policy are not specified.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Add baseline Helmet, CORS, rate limiting, request-size limit, safe centralized errors, request IDs, and graceful shutdown.

## Task Berikutnya

be/08-jwt-foundation
