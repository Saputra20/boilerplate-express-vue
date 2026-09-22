# be/12-logout-revocation — Logout And Revocation

## Tujuan

Implement session/JTI revocation and idempotent logout only after endpoint, storage, and all-device policy approval.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Implement session/JTI revocation and idempotent logout only after endpoint, storage, and all-device policy approval.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

be/11-refresh-token, be/05-redis-foundation

## Risiko / Hal yang Perlu Diperhatikan

TODO: REQUIREMENT NEEDED — logout path/transport, all-device behavior, storage owner, error contract.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Implement session/JTI revocation and idempotent logout only after endpoint, storage, and all-device policy approval.

## Task Berikutnya

be/13-rbac-permissions

Task ini tidak boleh dieksekusi sebelum Open Points diselesaikan.
