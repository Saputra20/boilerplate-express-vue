# be/09-password-hashing — Password Hashing

## Tujuan

Provide Argon2id hash and verify boundary without plaintext persistence, logging, or product password-policy invention.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Provide Argon2id hash and verify boundary without plaintext persistence, logging, or product password-policy invention.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

be/04-identity-schema

## Risiko / Hal yang Perlu Diperhatikan

TODO: REQUIREMENT NEEDED — password length and complexity policy.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Provide Argon2id hash and verify boundary without plaintext persistence, logging, or product password-policy invention.

## Task Berikutnya

be/10-login-session

Task ini tidak boleh dieksekusi sebelum Open Points diselesaikan.
