# be/09-password-hashing - Password Hashing

## Apa yang dibuat?

Task ini sekarang punya kontrak eksekusi untuk boundary hashing dan verification password lokal dengan Argon2id.

## Kenapa dibuat?

Task login dan pendaftaran berikutnya membutuhkan cara yang konsisten untuk membuat dan memeriksa hash password tanpa menyimpan plaintext.

## Apa yang berubah?

- Password memakai Argon2id.
- Panjang minimum adalah 12 karakter dan maksimum 128 karakter.
- Tidak ada aturan wajib huruf besar, angka, atau simbol. Passphrase panjang tetap valid.
- Password tidak di-trim, dinormalisasi, atau diubah sebelum hashing.
- Argon2 membuat salt acak untuk setiap hash.
- Plaintext dan encoded hash tidak boleh masuk log, error, atau response.

## Apa yang tidak berubah?

Task ini belum membuat registration, login, password change/reset, session, JWT, atau authorization. Breached-password check, MFA, credential history, dan forced password expiration juga belum dibuat.

## Dependency task apa?

Task ini memakai kontrak `users.password_hash` dari identity schema dan package Argon2 yang sudah terpasang.

## Risiko utama?

Password adalah credential opaque. Perubahan kecil seperti trim otomatis dapat membuat password yang sama tidak lagi cocok. Error juga tidak boleh membocorkan password atau hash.

## Bagaimana cara mengecek hasilnya?

Review test batas 11/12/128/129 karakter, password tanpa kombinasi karakter, whitespace, salt acak, verification benar/salah, hash malformed, dan error aman. Jalankan lint, typecheck, seluruh test API, `git diff --check`, dan Code Anti-Slop.

## Apa yang harus direview manusia?

Pastikan panjang 12 sampai 128 diterapkan tanpa trim, Argon2id memakai parameter eksplisit, tidak ada breach service, dan scope tidak masuk ke login atau registration.

## Apa yang belum dikerjakan?

Implementasi hashing belum dibuat dalam pembaruan dokumen ini. Registration, login, reset, rotation, breach check, dan lifecycle credential tetap task terpisah.
