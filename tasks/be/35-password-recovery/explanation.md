# be/35-password-recovery — Penjelasan

## 1. Apa yang dibuat?

Task ini merencanakan alur lupa kata sandi dan reset kata sandi dengan challenge sekali pakai yang kedaluwarsa.

## 2. Kenapa dibuat?

Sistem Auth sudah memiliki hash Argon2id dan sesi, tetapi belum memiliki alur pemulihan kata sandi yang aman.

## 3. Apa yang berubah?

Implementasi nantinya memakai challenge bersama, email reset, pembaruan hash kata sandi, audit, dan aturan sesi yang sudah disetujui.

## 4. Apa yang tidak berubah?

Task ini tidak mengubah kebijakan kata sandi, role, permission, halaman frontend, atau perilaku sesi tanpa keputusan manusia.

## 5. Dependency task apa?

Membutuhkan task SMTP, template, worker antrean, challenge verifikasi, Auth, sesi, dan audit.

## 6. Risiko utama?

Endpoint lupa kata sandi dapat membocorkan keberadaan akun. Token atau password juga tidak boleh ada di antrean, log, audit, database plaintext, atau respons API.

## 7. Bagaimana cara mengecek hasilnya?

Uji respons yang sama untuk email dikenal dan tidak dikenal, token valid/tidak valid, pemakaian paralel, dampak terhadap sesi, serta kebocoran data sensitif menggunakan transport palsu.

## 8. Apa yang harus direview manusia?

Manusia perlu menyetujui kontrak API, TTL, rate limit, URL reset, perilaku `mustChangePassword`, dan apakah reset mencabut sesi atau refresh token yang ada.

## 9. Apa yang belum dikerjakan?

Belum ada kode. Task masih terblokir oleh desain pengiriman token aman dan keputusan API/kebijakan sesi.
