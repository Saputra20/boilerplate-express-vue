# be/15-bullmq-foundation — BullMQ Foundation

## Tujuan

Implement BullMQ queue/worker lifecycle with removeOnComplete true, failed-job retention for seven days, and documented lazy-cleanup strategy.

## Kenapa Task Ini Dibutuhkan

Task ini menyiapkan fondasi kecil untuk urutan kerja berikutnya tanpa menebak aturan produk yang belum tersedia.

## Apa yang Akan Dikerjakan

- Implement BullMQ queue/worker lifecycle with removeOnComplete true, failed-job retention for seven days, and documented lazy-cleanup strategy.
- Validasi dan evidence sesuai technical.md.

## Apa yang Tidak Dikerjakan

- Pekerjaan task berikutnya, fitur bisnis lain, generic CRUD, dan keputusan yang ada di Open Points.

## Dependency

be/05-redis-foundation, be/06-logging-foundation

## Risiko / Hal yang Perlu Diperhatikan

TODO: REQUIREMENT NEEDED — queue names, retries/backoff, exact cleanup schedule if seven-day retention must be exact.

## Cara Verifikasi

Jalankan perintah lint, typecheck, test, build bila berlaku, git diff --check, dan Anti-Slop yang tercantum di technical.md.

## Yang Perlu Direview Human

Pastikan kontrak tidak ditebak, scope tidak melebar, keamanan tidak melemah, dan evidence acceptance criteria cukup.

## Output yang Diharapkan

Implement BullMQ queue/worker lifecycle with removeOnComplete true, failed-job retention for seven days, and documented lazy-cleanup strategy.

## Task Berikutnya

be/16-queue-monitor
