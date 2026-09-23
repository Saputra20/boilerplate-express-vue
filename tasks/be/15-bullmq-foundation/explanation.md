# be/15-bullmq-foundation — BullMQ Foundation

## Tujuan

Task ini membuat fondasi BullMQ memakai satu queue bernama `default` di atas Redis yang sudah ada.

## Perilaku Utama

- Queue bisnis baru dibuat oleh feature yang membutuhkannya, bukan oleh fondasi ini.
- Default job mendapat maksimal tiga total attempt.
- Retry memakai exponential backoff dengan delay awal satu detik.
- Completed job langsung dibuang.
- Failed job memiliki batas eligibility retention tujuh hari.

## Cleanup

Cleanup mengikuti mekanisme lazy BullMQ. Job gagal boleh dibersihkan setelah melewati usia tujuh hari saat ada aktivitas queue berikutnya. Penghapusan tidak dijamin tepat pada detik ke-7 hari. Task ini tidak membuat cron, timer, atau scheduler cleanup.

## Batas Scope

Task ini tidak membuat processor bisnis, producer bisnis, endpoint HTTP queue, payload global, database migration, atau queue monitor. `be/16` tetap memiliki queue monitor.

## Dependency dan Verifikasi

BullMQ memakai Redis foundation yang ada dan logging aman yang ada. Verifikasi mencakup default queue, retry, lifecycle shutdown, logging tanpa payload sensitif, Redis integration test, format, lint, typecheck, test, `git diff --check`, dan Code Anti-Slop.
