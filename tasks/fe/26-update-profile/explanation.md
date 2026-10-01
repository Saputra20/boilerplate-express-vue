# fe/26-update-profile - Perbarui Profil

## Apa yang dibuat?

Task ini merencanakan halaman `/profile` untuk pengguna CMS yang sudah login. Halaman hanya boleh menampilkan dan mengubah atribut yang ditetapkan oleh kontrak backend self-profile.

## Kenapa dibuat?

CMS belum memiliki halaman profil mandiri. `/api/v1/me` saat ini mengembalikan ID, email, dan status wajib ganti password; belum ada endpoint update profil pengguna sendiri.

## Apa yang berubah?

Task FE-26 kini mereferensikan BE-40. Kontrak menetapkan `/api/v1/me`, `PATCH /api/v1/me`, serta `displayName` sebagai satu-satunya field yang dapat diedit. Implementasi UI menunggu endpoint backend selesai.

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

Kontrak backend sudah direncanakan pada BE-40, tetapi implementasi API, migrasi, audit, tes, dan OpenAPI belum selesai. Halaman FE-26 belum diimplementasikan. Email tetap read-only; tidak ada upload avatar.
