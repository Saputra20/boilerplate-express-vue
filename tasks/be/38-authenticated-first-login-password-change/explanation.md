# be/38-authenticated-first-login-password-change : Ganti Password Pertama Kali

## Apa yang dibuat?

Backend kini menyediakan status wajib ganti password dari database melalui `/api/v1/me`, endpoint authenticated khusus untuk mengganti password, dan pembatasan terpusat pada API bisnis selama status tersebut aktif.

## Kenapa dibuat?

Flag login sebelumnya tidak dapat dipulihkan melalui `/me` dan middleware tidak membatasi akses API, sehingga FE-24 belum memiliki kontrak yang lengkap dan aman.

## Apa yang berubah?

Endpoint memverifikasi password saat ini, menerapkan aturan password bersama, mengganti hash dan menghapus flag, mempertahankan sesi saat ini, mencabut sesi lain, serta menulis audit keberhasilan dalam satu transaksi. OpenAPI dan tes terkait juga diperbarui.

## Apa yang tidak berubah?

Flow reset password publik tetap memakai token pemulihan dan mencabut semua sesi. Tidak ada perubahan pada CMS, klaim JWT, kebijakan password default, maupun skema database.

## Dependency task apa?

`be/09`, `be/10`, `be/12`, `be/14`, `be/21`, `be/25`, `be/35`, dan `be/37`. FE-24 dapat memakai kontrak ini setelah validasi PostgreSQL terisolasi lulus.

## Risiko utama?

Jika nilai database tidak dibaca saat autentikasi atau transaksi audit tidak atomik, sesi dapat melewati kewajiban atau perubahan password dapat terjadi tanpa catatan audit yang diwajibkan.

## Bagaimana cara mengecek hasilnya?

Lint, typecheck, format, OpenAPI, dan seluruh API test suite sudah lulus. Tes PostgreSQL untuk concurrency, rollback audit, flag, hash, dan efek sesi sudah ditulis tetapi belum dijalankan karena Docker daemon tidak tersedia.

## Apa yang harus direview manusia?

Periksa hasil pencabutan sesi lain dan bukti transaksi PostgreSQL ketika lingkungan test tersedia. Pilihan current password, `204`, sesi saat ini tetap aktif, serta enforcement backend sudah disetujui melalui permintaan implementasi ini.

## Apa yang belum dikerjakan?

Menjalankan dan meluluskan tes integrasi PostgreSQL. Implementasi frontend FE-24 juga belum dimulai.
