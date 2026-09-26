# be/33-email-queue-worker — Worker Email

## Apa yang dibuat?

Worker BullMQ untuk mengirim email transaksi memakai queue `default` yang sudah ada.

## Kenapa dibuat?

Pengiriman SMTP tidak boleh memperlambat request Auth dan perlu retry terukur.

## Apa yang berubah?

Rencana mencakup producer/worker Notification dan kemungkinan tabel delivery bila benar-benar diperlukan.

## Apa yang tidak berubah?

Tidak ada queue kedua, endpoint queue, atau token mentah di payload/job monitor.

## Dependency task apa?

BullMQ, audit, SMTP, dan template foundation.

## Risiko utama?

Worker tidak dapat membentuk link aman bila hanya menerima delivery ID. Ini adalah blocker yang sengaja dicatat, bukan diakali dengan menyimpan token mentah.

## Bagaimana cara mengecek hasilnya?

Redis/Postgres test terisolasi, fake SMTP, retry, failure exhaustion, shutdown, dan review payload monitor.

## Apa yang harus direview manusia?

Strategi handoff token, tabel delivery, outbox/recovery enqueue, serta angka retry/concurrency/timeout.

## Apa yang belum dikerjakan?

Task tidak boleh diimplementasikan sampai keputusan keamanan tersebut disetujui.
