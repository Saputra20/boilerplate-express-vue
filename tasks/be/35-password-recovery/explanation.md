# be/35-password-recovery — Penjelasan

## 1. Apa yang dibuat?

Task ini mengimplementasikan permintaan pemulihan kata sandi dan reset sekali pakai melalui email, memakai challenge bersama yang kedaluwarsa.

## 2. Kenapa dibuat?

Sistem Auth sudah memiliki hash Argon2id dan sesi, tetapi belum memiliki alur pemulihan kata sandi yang aman.

## 3. Apa yang berubah?

API publik, TTL satu jam, rate limit, audit, pencabutan semua sesi, dan pembersihan flag `mustChangePassword` sudah disetujui. Implementasi memakai challenge bersama, email reset terenkripsi melalui be/33, pembaruan hash, dan transaksi atomik.

## 4. Apa yang tidak berubah?

Task ini tidak mengubah kebijakan kata sandi, role, permission, atau halaman frontend. Reset kata sandi mencabut seluruh sesi aktif sesuai keputusan yang disetujui.

## 5. Dependency task apa?

Membutuhkan task SMTP, template, worker antrean, challenge verifikasi, Auth, sesi, dan audit.

## 6. Risiko utama?

Endpoint lupa kata sandi dapat membocorkan keberadaan akun. Token atau password juga tidak boleh ada di antrean, log, audit, database plaintext, atau respons API.

## 7. Bagaimana cara mengecek hasilnya?

Uji respons yang sama untuk email dikenal dan tidak dikenal, token valid/tidak valid, pemakaian paralel, dampak terhadap sesi, serta kebocoran data sensitif menggunakan transport palsu.

## 8. Apa yang harus direview manusia?

Reviewer perlu memeriksa kontrak API, migrasi purpose challenge, transaksi reset/revokasi sesi, dan bukti integrasi PostgreSQL.

## 9. Apa yang belum dikerjakan?

Belum ada halaman frontend reset kata sandi. Integrasi PostgreSQL, migration purpose UP/DOWN/RE-UP, HTTP/OpenAPI, dan full API suite sudah tervalidasi melalui be/37.
