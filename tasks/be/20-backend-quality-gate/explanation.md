# be/20-backend-quality-gate — Backend Quality Gate

## Tujuan

Document executable quality-gate selection, Anti-Slop evidence, validation order, diff/secrets review, and truthful status reporting without app behavior change.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Document executable quality-gate selection, Anti-Slop evidence, validation order, diff/secrets review, and truthful status reporting without app behavior change.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

be/19-backend-testing

## Risiko / Hal yang Perlu Diperhatikan

Anti-Slop installation and command syntax are not specified in repository.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Document executable quality-gate selection, Anti-Slop evidence, validation order, diff/secrets review, and truthful status reporting without app behavior change.

## Task Berikutnya

`be/21-api-module-architecture-refactor` — reorganisasi source API dilakukan hanya setelah quality gate backend lulus.

Task ini tidak boleh dieksekusi sebelum Open Points diselesaikan.
