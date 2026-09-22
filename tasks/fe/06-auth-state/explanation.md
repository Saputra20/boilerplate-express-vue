# fe/06-auth-state — Authentication State

## Tujuan

Create Pinia auth state and session restoration behavior only after token transport/storage and backend contract are approved.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Create Pinia auth state and session restoration behavior only after token transport/storage and backend contract are approved.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

fe/05-api-client

## Risiko / Hal yang Perlu Diperhatikan

TODO: REQUIREMENT NEEDED — token transport/storage, refresh contract, profile shape, logout behavior.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Create Pinia auth state and session restoration behavior only after token transport/storage and backend contract are approved.

## Task Berikutnya

fe/07-login-page

Task ini tidak boleh dieksekusi sebelum Open Points diselesaikan.
