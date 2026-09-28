# be/33-email-queue-worker — Worker Email

## Apa yang dibuat?

Queue `email` dan worker untuk pengiriman email transaksi, memakai Redis/BullMQ yang sudah ada. Job hanya membawa `emailDeliveryId`. Konteks email sensitif disimpan terenkripsi AES-256-GCM pada tabel `email_deliveries`.

## Kenapa dibuat?

Pengiriman SMTP berjalan di luar request Auth. Worker harus bisa retry kegagalan yang aman, pulih dari enqueue yang gagal, dan mencegah pengiriman otomatis ulang ketika hasil SMTP tidak pasti.

## Apa yang berubah?

Task menambahkan persistence delivery, enkripsi konteks dan alamat penerima saat disimpan, status sent/failed/uncertain, aturan retry khusus queue email, lifecycle worker, dan operasi cleanup deterministik. Kebijakan global `default` dari be/15 dan queue non-email tetap sama.

## Apa yang tidak berubah?

Tidak ada perubahan route Auth, challenge schema/lifecycle, queue non-email, SMTP provider, Queue Monitor menjadi writable, atau scheduler baru. Migration bertahap mempertahankan recipient lama sampai backfill terenkripsi berhasil diverifikasi, lalu menghapus kolom plaintext. Migration 0018 sengaja tidak dapat di-DOWN karena pemulihan plaintext penerima melanggar kontrak keamanan; pemulihan database memerlukan snapshot sebelum migrasi. be/34 dan be/35 akan membuat challenge dan memasok expiry saat membuat delivery. Task ini tidak mengklaim visual/client acceptance be/32.

## Dependency task apa?

Memakai BullMQ/Redis dari be/15, audit dari be/14, SMTP dari be/31, dan kontrak renderer serta bukti implementasi otomatis be/32. Review visual dan kompatibilitas email-client be/32 tetap terpisah; be/37 memverifikasi integrasi backend dan tidak menyatakan review tersebut lulus.

## Risiko utama?

Token atau URL reset/verifikasi dapat bocor bila payload, ciphertext, renderer context, log, audit, atau Queue Monitor salah dibuka. Timeout SMTP juga dapat memiliki hasil ambigu; kondisi ini ditandai `uncertain` dan tidak dikirim ulang otomatis. Operasi cleanup harus dipanggil melalui mekanisme operasional yang ditetapkan deployment.

## Bagaimana cara mengecek hasilnya?

PostgreSQL/Redis integration, HTTP Queue Monitor, migration 0015–0017 DOWN/reapply, backfill dan penolakan DOWN migration 0018, full API suite, lint, typecheck, format, Code Anti-Slop, dan secret review telah lulus melalui be/37. Pengujian menggunakan PostgreSQL/Redis disposable dan fake transport; tidak ada email yang dikirim ke provider sungguhan.

## Apa yang harus direview manusia?

Pastikan konfigurasi key enkripsi dipasang sebagai secret khusus, urutan migration dan backfill dijalankan saat API/worker berhenti, cleanup dipanggil oleh mekanisme operasional deployment, dan Queue Monitor tidak menampilkan penerima atau ciphertext. Simpan backup sebelum migrasi 0018; aplikasi yang di-rollback harus kompatibel dengan schema terenkripsi. be/37 membuktikan integrasi backend email; review visual dan kompatibilitas client be/32 tetap menjadi validasi terpisah.

## Apa yang belum dikerjakan?

Task ini tidak menambah scheduler. Pemanggilan berkala cleanup menjadi dependency operasional yang harus dihubungkan deployment. Auth challenge dan endpoint dibuat pada be/34 dan be/35; kualitas visual email masih menunggu review di be/32.
