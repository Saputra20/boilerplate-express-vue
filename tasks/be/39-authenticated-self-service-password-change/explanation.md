# be/39-authenticated-self-service-password-change - Ganti Password Mandiri

## Apa yang dibuat?

Auth module sekarang menyediakan `POST /api/v1/auth/change-password/self-service` untuk pengguna terautentikasi yang ingin mengganti password sendiri. Endpoint ini mendukung FE-25 dan tidak menggantikan flow wajib FE-24.

## Kenapa dibuat?

Endpoint BE-38 hanya menerima pengguna yang masih memiliki `mustChangePassword: true`. Pengguna biasa mendapat `409 password_change_not_required`, sehingga FE-25 belum memiliki API yang dapat digunakan.

## Apa yang berubah?

BE-38 hanya menerima pengguna yang masih wajib mengganti password. BE-39 menambahkan endpoint terpisah, memeriksa current password, memakai aturan password kanonis, mencatat audit, mempertahankan sesi saat ini, dan mencabut sesi lain dalam transaksi.

## Apa yang tidak berubah?

Endpoint mandatory BE-38, reset password publik, sesi/token secara umum, skema database, dan UI FE-25 tidak berubah dalam task ini.

## Dependency task apa?

Task bergantung pada fondasi hashing, session, refresh, revocation, audit, arsitektur module, password recovery, quality gate auth, dan BE-38. Task ini memblokir `fe/25-change-password` sampai implementasi dan kontrak lulus pemeriksaan.

## Risiko utama?

Risiko utama adalah perubahan password berhasil tanpa pencabutan sesi lain atau audit yang diwajibkan. Karena itu hash, pencabutan sesi/token, dan audit keberhasilan harus berada dalam satu transaksi.

## Bagaimana cara mengecek hasilnya?

Lint, typecheck, format, dan 15 tes HTTP/OpenAPI lulus. Tes integrasi PostgreSQL tersedia tetapi belum dijalankan karena database test tidak aktif pada port 5433; jalankan suite tersebut sebelum menandai BE-39 selesai.

## Apa yang harus direview manusia?

Reviewer perlu memastikan route self-service berbeda dari route mandatory, mempertahankan sesi aktif, mencabut sesi lain, dan tidak mencatat kredensial pada audit. Tinjau juga hasil tes integrasi setelah database tersedia.

## Apa yang belum dikerjakan?

Endpoint, OpenAPI, tes, dokumentasi API, dan handoff FE-25 sudah diperbarui. Tes PostgreSQL terisolasi masih menunggu database test pada port 5433.
