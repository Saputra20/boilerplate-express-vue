# be/37-auth-email-quality-gate — Penjelasan

## 1. Apa yang dibuat?

Task ini adalah gerbang kualitas terakhir untuk membuktikan seluruh rantai email Auth berjalan aman dan terintegrasi.

## 2. Kenapa dibuat?

Fondasi SMTP, template, worker, challenge, reset password, dan observabilitas saling bergantung. Pengujian terpisah belum cukup untuk membuktikan alur lengkap.

## 3. Apa yang berubah?

Task ini menjalankan pengujian gabungan dan hanya memperbaiki defect kecil yang langsung melanggar kontrak task 31–36.

## 4. Apa yang tidak berubah?

Tidak menambah fitur email baru, endpoint baru, UI, RBAC, perubahan provider, atau kebijakan sesi baru.

## 5. Dependency task apa?

Semua task 31 sampai 36 harus selesai dan seluruh keputusan yang membutuhkan persetujuan harus sudah tercatat.

## 6. Risiko utama?

Masalah antar modul dapat membocorkan token atau data pribadi, menyebabkan respons enumeration, atau membuat worker dan shutdown tidak konsisten.

## 7. Bagaimana cara mengecek hasilnya?

Jalankan layanan PostgreSQL/Redis terisolasi, transport SMTP palsu, uji alur penuh verifikasi dan reset, migrasi UP/DOWN/reapply, shutdown, Queue Monitor, serta pemeriksaan log dan diff.

## 8. Apa yang harus direview manusia?

Manusia perlu memastikan seluruh open point pendahulu sudah disetujui, terutama handoff token, API publik, TTL/rate limit, dan dampak reset pada sesi.

## 9. Apa yang belum dikerjakan?

Belum ada perubahan kode pada task perencanaan ini. Task ini dijalankan setelah task 31–36 benar-benar selesai.
