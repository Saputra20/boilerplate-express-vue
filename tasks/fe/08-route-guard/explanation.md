# fe/08-route-guard — Route Guard

## Tujuan

Create authenticated-route guard with approved redirect/return-location policy only after route/auth contract approval.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Create authenticated-route guard with approved redirect/return-location policy only after route/auth contract approval.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

fe/06-auth-state

## Risiko / Hal yang Perlu Diperhatikan

TODO: REQUIREMENT NEEDED — protected routes, login route, return URL policy, unauthorized behavior.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Create authenticated-route guard with approved redirect/return-location policy only after route/auth contract approval.

## Task Berikutnya

fe/09-permission-guard

Task ini tidak boleh dieksekusi sebelum Open Points diselesaikan.
