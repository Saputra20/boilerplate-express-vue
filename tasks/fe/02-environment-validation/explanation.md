# fe/02-environment-validation — Environment Validation

## Tujuan

Validate documented environment values with Zod before application startup or CMS mount; reject missing, empty, malformed, and unsupported values without exposing secrets.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Validate documented environment values with Zod before application startup or CMS mount; reject missing, empty, malformed, and unsupported values without exposing secrets.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

fe/01-initial-project

## Risiko / Hal yang Perlu Diperhatikan

None.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Validate documented environment values with Zod before application startup or CMS mount; reject missing, empty, malformed, and unsupported values without exposing secrets.

## Task Berikutnya

fe/03-cms-layout
