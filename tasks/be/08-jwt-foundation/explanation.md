# be/08-jwt-foundation — JWT Foundation

## Tujuan

Load RS256 keys and provide sign/verify boundary enforcing issuer, audience, expiry, applicable nbf, JTI, and algorithm restrictions.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Load RS256 keys and provide sign/verify boundary enforcing issuer, audience, expiry, applicable nbf, JTI, and algorithm restrictions.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

be/02-environment-validation, be/07-security-foundation

## Risiko / Hal yang Perlu Diperhatikan

TODO: REQUIREMENT NEEDED — subject and custom JWT claim schema.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Load RS256 keys and provide sign/verify boundary enforcing issuer, audience, expiry, applicable nbf, JTI, and algorithm restrictions.

## Task Berikutnya

be/09-password-hashing

Task ini tidak boleh dieksekusi sebelum Open Points diselesaikan.
