# fe/25-change-password  -  Ubah Password Secara Sukarela

## Apa yang dibuat?

Task ini membuat halaman authenticated `/settings/change-password`, terpisah dari flow wajib pertama kali di `/change-password`. Halaman menggunakan endpoint self-service BE-39.

## Kenapa dibuat?

Flow FE-24 dan endpoint BE-38 hanya berlaku untuk perubahan password wajib. BE-39 menyediakan endpoint terpisah untuk pengguna biasa dan mendefinisikan validasi, audit, error, rate limit, serta hasil sesi.

## Apa yang berubah?

CMS kini memiliki route, formulir, validasi, API client, dan tautan menu profil untuk perubahan password sukarela. Request mengirim current dan new password ke `POST /api/v1/auth/change-password/self-service`; konfirmasi hanya di frontend. Sesi saat ini dipertahankan mengikuti BE-39. Tes, lint, typecheck, format, dan build CMS lulus.

## Apa yang tidak berubah?

FE-24 dan backend tidak diubah oleh FE-25. Flow reset password publik tetap terpisah. Browser menampilkan halaman tanpa overflow pada lebar 860 CSS px; verifikasi viewport mobile belum dapat dijalankan karena kontrol browser yang tersedia tidak mendukung perubahan ukuran viewport.

## Dependency task apa?

Membutuhkan FE-04, FE-06, FE-11, FE-13, serta BE-39. BE-38 tetap terpisah dan bukan endpoint untuk perubahan sukarela.

## Risiko utama?

Jika frontend memakai kontrak FE-24, pengguna normal tidak dapat mengganti password dan kebijakan sesi berisiko ditebak. BE-39 sekarang menetapkan dan memverifikasi kontraknya.

## Bagaimana cara mengecek hasilnya?

Pemeriksaan penuh CMS: 20 file tes dan 200 tes lulus; lint, typecheck, format, build, Code/UI Anti-Slop, dan `git diff --check` lulus. Pemeriksaan browser dilakukan pada 860 CSS px. Ukuran mobile belum diperiksa karena viewport browser tidak dapat diubah melalui kontrol yang tersedia.

## Apa yang harus direview manusia?

Reviewer perlu memastikan halaman memakai route API self-service BE-39, mengikuti validasi/error contract, serta tidak mengubah flow `/change-password` milik FE-24.

## Apa yang belum dikerjakan?

UI dan integrasi FE-25 telah diimplementasikan. Reviewer perlu memperhatikan catatan verifikasi viewport mobile yang belum tersedia; pemeriksaan browser dilakukan pada 860 CSS px.
