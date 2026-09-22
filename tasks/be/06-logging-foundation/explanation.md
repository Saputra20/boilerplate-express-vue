# be/06-logging-foundation — Logging Foundation

## Tujuan

Add Morgan/Pino request-correlated terminal/file logging, error/access separation, redaction, and bounded growth behavior.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Add Morgan/Pino request-correlated terminal/file logging, error/access separation, redaction, and bounded growth behavior.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

be/02-environment-validation

## Risiko / Hal yang Perlu Diperhatikan

Log rotation size/retention policy is not specified; request clarification before choosing one.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Add Morgan/Pino request-correlated terminal/file logging, error/access separation, redaction, and bounded growth behavior.

## Task Berikutnya

be/07-security-foundation
