# Pagination Audit Trail berbasis halaman

## Apa yang dibuat?

Daftar Audit Trail memakai nomor halaman dan mengembalikan `page`, `limit`, `total`, serta `totalPages`.

## Kenapa dibuat?

Pengguna meminta respons pagination Audit Trail sama bentuknya dengan daftar CMS lainnya, dengan ukuran awal 10 baris.

## Apa yang berubah?

Parameter `cursor` pada daftar diganti `page` mulai dari 1. Backend menghitung total event yang cocok dengan filter. Tombol Previous/Next di CMS memakai nomor halaman dan jumlah halaman dari API. OpenAPI serta tipe CMS mengikuti kontrak baru.

## Apa yang tidak berubah?

Urutan event, filter, detail, CSV, izin akses, dan pilihan ukuran halaman tetap. Tidak ada migrasi database.

## Dependency task apa?

Implementasi Audit Trail `be/41` dan UI yang sudah ada, termasuk `fe/43`.

## Risiko utama?

Hitungan total menambah query database. Jika data baru masuk saat pengguna berpindah halaman, isi halaman berbasis offset dapat bergeser; itu konsekuensi perubahan dari cursor yang diminta.

## Bagaimana cara mengecek hasilnya?

Buka Audit Trail, pindah halaman, ubah ukuran halaman, lalu terapkan filter. Periksa nilai `pagination` pada respons API dan kesesuaian rentang hasil di footer.

## Apa yang harus direview manusia?

Pastikan kontrak API baru tepat, terutama total setelah filter, halaman di luar rentang, dan penghapusan `cursor`.

## Apa yang belum dikerjakan?

Tidak ada perubahan pada ekspor, izin, atau fitur Audit Trail lainnya.
