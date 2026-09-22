# be/11-refresh-token — Refresh Token Rotation

## Tujuan

Implement session-bound refresh-token issuance, validation, atomic rotation, and reuse detection only after storage and API policy approval.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Implement session-bound refresh-token issuance, validation, atomic rotation, and reuse detection only after storage and API policy approval.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

be/10-login-session

## Risiko / Hal yang Perlu Diperhatikan

TODO: REQUIREMENT NEEDED — transport, token-record schema, rotation/reuse policy, expiry, error contract.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Implement session-bound refresh-token issuance, validation, atomic rotation, and reuse detection only after storage and API policy approval.

## Task Berikutnya

be/12-logout-revocation

Task ini tidak boleh dieksekusi sebelum Open Points diselesaikan.
