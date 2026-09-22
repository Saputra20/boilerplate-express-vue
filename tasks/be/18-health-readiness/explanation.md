# be/18-health-readiness — Health And Readiness

## Tujuan

Implement separate process liveness GET /health and dependency readiness GET /ready without exposing dependency secrets or internals.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Implement separate process liveness GET /health and dependency readiness GET /ready without exposing dependency secrets or internals.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

be/03-database-foundation, be/05-redis-foundation, be/07-security-foundation

## Risiko / Hal yang Perlu Diperhatikan

TODO: REQUIREMENT NEEDED — exact status/body contract and network/auth exposure policy.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Implement separate process liveness GET /health and dependency readiness GET /ready without exposing dependency secrets or internals.

## Task Berikutnya

be/19-backend-testing

Task ini tidak boleh dieksekusi sebelum Open Points diselesaikan.
