# be/34-email-verification — Penjelasan

## 1. Apa yang dibuat?

Task ini merencanakan alur verifikasi email sekali pakai dengan masa berlaku terbatas. Jika token valid dipakai, sistem mengisi `emailVerifiedAt` pada pengguna.

## 2. Kenapa dibuat?

Kolom status verifikasi email sudah ada, tetapi belum ada mekanisme aman untuk membuat, mengirim, dan memakai tautan verifikasi.

## 3. Apa yang berubah?

Implementasi nanti menambah penyimpanan challenge, layanan Auth, pengiriman email melalui antrean, audit aman, dan endpoint yang sudah disetujui.

## 4. Apa yang tidak berubah?

Tidak ada perubahan pada login, role, permission, UI, atau aturan sesi tanpa persetujuan terpisah.

## 5. Dependency task apa?

Membutuhkan fondasi SMTP (31), template (32), worker antrean aman (33), fondasi Auth, dan audit yang sudah ada.

## 6. Risiko utama?

Token mentah tidak boleh masuk database, BullMQ, Queue Monitor, log, atau audit. Worker juga tidak dapat menyusun token acak hanya dari `emailDeliveryId` tanpa desain handoff aman yang disetujui.

## 7. Bagaimana cara mengecek hasilnya?

Gunakan transport email palsu dan data sintetis. Uji token valid, kedaluwarsa, sudah dipakai, dicabut, permintaan email tidak dikenal, serta periksa payload antrean dan log untuk memastikan tidak ada token mentah.

## 8. Apa yang harus direview manusia?

Manusia perlu menyetujui bentuk API, TTL, cooldown/kebijakan resend, URL frontend, desain hash/handoff token, dan nama audit event.

## 9. Apa yang belum dikerjakan?

Task ini belum mengubah kode. Pekerjaan tetap terblokir sampai kontrak token-ke-worker dan kontrak API disetujui.
