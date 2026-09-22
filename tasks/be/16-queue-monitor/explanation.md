# be/16-queue-monitor — Queue Monitor

## Tujuan

Expose protected queue-monitor capability using environment credentials only after monitor route/auth policy approval.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Expose protected queue-monitor capability using environment credentials only after monitor route/auth policy approval.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

be/15-bullmq-foundation, be/07-security-foundation

## Risiko / Hal yang Perlu Diperhatikan

TODO: REQUIREMENT NEEDED — monitor package, path, auth/permission, audience, CSRF behavior.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Expose protected queue-monitor capability using environment credentials only after monitor route/auth policy approval.

## Task Berikutnya

be/17-openapi

Task ini tidak boleh dieksekusi sebelum Open Points diselesaikan.
