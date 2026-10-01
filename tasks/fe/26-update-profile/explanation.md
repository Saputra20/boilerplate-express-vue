# fe/26-update-profile - Perbarui Profil

## Apa yang dibuat?

Task ini merencanakan halaman `/profile` untuk pengguna CMS yang sudah login. Halaman hanya boleh menampilkan dan mengubah atribut yang ditetapkan oleh kontrak backend self-profile.

## Kenapa dibuat?

CMS belum memiliki halaman profil mandiri. Perubahan kode BE-40 menambahkan `displayName` pada `/api/v1/me` dan menyediakan `PATCH /api/v1/me`; BE-40 masih menunggu validasi PostgreSQL, migrasi, dan tes runtime lainnya.

## Apa yang berubah?

Task FE-26 kini mereferensikan kontrak BE-40: `/api/v1/me`, `PATCH /api/v1/me`, serta `displayName` sebagai satu-satunya field yang dapat diedit. Implementasi UI menunggu BE-40 lulus seluruh validasi.

## Apa yang tidak berubah?

Task ini tidak mengubah API/backend, administrasi user, RBAC, email verification, atau penyimpanan avatar. Kolom database dan endpoint admin tidak dianggap sebagai izin untuk mengedit profil sendiri.

## Dependency task apa?

Membutuhkan FE-04, FE-06, FE-11, FE-13, dan BE-40 (`be/40-authenticated-self-profile`). FE-26 tetap diblokir sampai BE-40 selesai. FE-24 bukan dependency.

## Risiko utama?

Menebak field atau memakai endpoint admin dapat membuka perubahan data yang tidak disetujui. BE-40 sudah menetapkan kontrak `displayName`; implementasi frontend tetap menunggu backend selesai.

## Bagaimana cara mengecek hasilnya?

Setelah dependency backend tersedia, implementer menjalankan tes route/API/store/form, suite CMS, lint, typecheck, build, Anti-Slop, pemeriksaan browser bila tersedia, dan `git diff --check`.

## Apa yang harus direview manusia?

Reviewer perlu memastikan FE hanya mengedit `displayName` sesuai BE-40, memuat ulang `/api/v1/me` setelah sukses, dan mempertahankan email, role, permission, serta status sebagai read-only.

## Apa yang belum dikerjakan?

Kode API, migrasi, audit, dan OpenAPI BE-40 sudah ditambahkan, tetapi validasi PostgreSQL dan sebagian tes runtime belum dapat dijalankan karena layanan lokal tidak tersedia. Halaman FE-26 belum dibuat. Email tetap hanya-baca; tidak ada unggah avatar.
