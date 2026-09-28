# be/36-email-queue-observability — Penjelasan

## 1. Apa yang dibuat?

Task ini menambahkan visibilitas aman untuk status dan kegagalan job email transaksional pada Queue Monitor dan log aplikasi.

## 2. Kenapa dibuat?

Operator perlu mengetahui status dan kegagalan pengiriman, tetapi Bull Board dapat menampilkan payload job dan alasan gagal secara langsung.

## 3. Apa yang berubah?

Queue email terdaftar di monitor yang read-only. Worker menormalkan kegagalan menjadi kategori terbatas sebelum BullMQ menyimpan alasan gagal, dan log kegagalan hanya memuat nama queue, ID delivery, jumlah percobaan yang dibatasi, serta kategori aman. Payload job tetap hanya berisi ID delivery.

## 4. Apa yang tidak berubah?

Basic Auth pada `/ops/queues`, sifat read-only Queue Monitor, retry antrean, RBAC, dan UI CMS tidak diubah.

## 5. Dependency task apa?

Task ini memakai queue worker be/33, audit be/14, dan monitor be/16. Validasi PostgreSQL/Redis, Queue Monitor HTTP, dan full API suite telah lulus di be/37.

## 6. Risiko utama?

Payload job atau alasan gagal dapat membocorkan token, alamat email, isi pesan, credential, atau stack trace. Karena itu data harus aman sejak dibuat.

## 7. Bagaimana cara mengecek hasilnya?

Focused unit/integration tests mencakup kategori error, metadata log, payload, Queue Monitor HTTP, dan Redis/BullMQ runtime. Lint, typecheck, format, full API suite, dan `git diff --check` juga lulus di be/37.

## 8. Apa yang harus direview manusia?

Review kategori kegagalan, daftar field log, payload opaque ID, dan bahwa Queue Monitor tetap memakai Basic Auth dan mode read-only. Validasi HTTP dan runtime queue menjadi bukti lanjutan di be/37.

## 9. Apa yang belum dikerjakan?

Tidak ada validasi backend email yang tertunda untuk be/33–37. Review visual dan kompatibilitas email-client be/32 tetap terpisah dan tidak dinyatakan lulus oleh gate backend ini.
