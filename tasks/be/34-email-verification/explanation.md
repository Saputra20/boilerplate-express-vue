# be/34-email-verification — Penjelasan

## 1. Apa yang dibuat?

Task ini merencanakan alur verifikasi email sekali pakai dengan masa berlaku terbatas. Jika token valid dipakai, sistem mengisi `emailVerifiedAt` pada pengguna.

## 2. Kenapa dibuat?

Kolom status verifikasi email sudah ada, tetapi belum ada mekanisme aman untuk membuat, mengirim, dan memakai tautan verifikasi.

## 3. Apa yang berubah?

Kontrak menyetujui endpoint request dan verify, token acak 256-bit dengan hash SHA-256, masa berlaku 24 jam, cooldown 60 detik, batas request/verifikasi, penggantian challenge aktif, audit, serta tautan frontend `/verify-email`. `PUBLIC_APP_URL` menjadi sumber kanonis URL frontend untuk tautan verifikasi dan reset password. Implementasi menambah konfigurasi itu, penyimpanan challenge, layanan Auth, pengiriman melalui be/33, dan endpoint tersebut.

## 4. Apa yang tidak berubah?

Tidak ada perubahan pada login, role, permission, UI, atau aturan sesi tanpa persetujuan terpisah.

## 5. Dependency task apa?

Membutuhkan fondasi SMTP (31), template (32), worker antrean aman (33), fondasi Auth, dan audit yang sudah ada.

## 6. Risiko utama?

Token mentah tidak boleh masuk database, BullMQ, Queue Monitor, log, atau audit. Worker menggunakan handoff terenkripsi dari be/33; URL aksi HTTP loopback hanya diizinkan pada development/test melalui opsi renderer eksplisit, sementara production tetap HTTPS.

## 7. Bagaimana cara mengecek hasilnya?

Gunakan transport email palsu dan data sintetis. Uji token valid, kedaluwarsa, sudah dipakai, dicabut, permintaan email tidak dikenal, serta periksa payload antrean dan log untuk memastikan tidak ada token mentah.

## 8. Apa yang harus direview manusia?

Keputusan API, URL frontend, dan siklus token sudah disetujui. Review manusia perlu memeriksa kontrak API, migrasi challenge, serta batas token dan metadata audit.

## 9. Apa yang belum dikerjakan?

Task ini tidak membuat halaman frontend `/verify-email`; halaman tersebut tetap menjadi pekerjaan frontend terpisah. Token memakai konteks email terenkripsi be/33, dan perubahan kompatibilitas renderer loopback HTTP sudah dicatat di be/32. Backfill, migrasi penghapusan kolom plaintext, penolakan DOWN yang irreversibel, integrasi PostgreSQL, HTTP/OpenAPI, dan full API suite telah divalidasi melalui be/37.
