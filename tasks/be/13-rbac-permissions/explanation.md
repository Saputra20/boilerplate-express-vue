# be/13-rbac-permissions — RBAC And Permissions

## Tujuan

Implement deny-by-default server-side permission enforcement over explicit user-role-permission-action relations only after catalog and route policy approval.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Implement deny-by-default server-side permission enforcement over explicit user-role-permission-action relations only after catalog and route policy approval.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

be/04-identity-schema, be/10-login-session

## Risiko / Hal yang Perlu Diperhatikan

TODO: REQUIREMENT NEEDED — permission catalog, route mapping, resource policy, denial contract.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Implement deny-by-default server-side permission enforcement over explicit user-role-permission-action relations only after catalog and route policy approval.

## Task Berikutnya

be/14-audit-trail

Task ini tidak boleh dieksekusi sebelum Open Points diselesaikan.
