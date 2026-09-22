# be/10-login-session — Login And Session

## Tujuan

Implement login request validation, credential verification, session creation, access-token issue, and audit outcome only after API and identity contract approval.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Implement login request validation, credential verification, session creation, access-token issue, and audit outcome only after API and identity contract approval.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

be/04-identity-schema, be/08-jwt-foundation, be/09-password-hashing

## Risiko / Hal yang Perlu Diperhatikan

TODO: REQUIREMENT NEEDED — login path, fields, response/error contract, account states, session fields.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Implement login request validation, credential verification, session creation, access-token issue, and audit outcome only after API and identity contract approval.

## Task Berikutnya

be/11-refresh-token

Task ini tidak boleh dieksekusi sebelum Open Points diselesaikan.
