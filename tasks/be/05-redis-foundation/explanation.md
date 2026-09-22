# be/05-redis-foundation — Redis Foundation

## Tujuan

Create Redis lifecycle from separated configuration for later session-supporting data and BullMQ; do not define cache or session policy.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Create Redis lifecycle from separated configuration for later session-supporting data and BullMQ; do not define cache or session policy.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

be/02-environment-validation

## Risiko / Hal yang Perlu Diperhatikan

None.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Create Redis lifecycle from separated configuration for later session-supporting data and BullMQ; do not define cache or session policy.

## Task Berikutnya

be/06-logging-foundation
