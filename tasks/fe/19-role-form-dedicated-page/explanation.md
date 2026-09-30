# fe/19-role-form-dedicated-page — Halaman Form Role Terpisah

## 1. Apa yang dibuat?

Kontrak task untuk memindahkan pembuatan dan pengeditan Role dari modal ke halaman `/roles/create` dan `/roles/:id/edit`. Daftar Role dan modal konfirmasi hapus tetap dipertahankan.

## 2. Kenapa dibuat?

Form yang memuat banyak permission akan sulit digunakan jika terus berada di dalam modal. Halaman khusus memberi ruang gulir normal dan mendukung pembukaan URL secara langsung.

## 3. Apa yang berubah?

Create/Edit kini memakai halaman khusus dan satu form bersama. Data Role serta katalog permission tetap diambil dari API yang ada; permission dikelompokkan dari katalog dan dapat dipilih per grup. Form memakai API dan kode permission yang sekarang.

## 4. Apa yang tidak berubah?

Tidak ada perubahan API, database, kode permission, backend RBAC, atau auth store. Daftar Role tetap memakai pencarian, pengurutan, pagination, dan konfirmasi modal untuk hapus.

## 5. Dependency task apa?

Task memakai foundation UI `fe/13-tailadmin-ui-foundation`, kontrak UI/API `fe/15-role-crud`, dan implementasi Role API serta katalog permission yang sudah ada.

## 6. Risiko utama?

Route baru dapat salah menerapkan permission, form edit dapat tampil sebelum data tersedia, atau pengelompokan UI dapat mengubah nilai yang dikirim. Karena itu route memakai guard yang sama dan nilai permission tetap berasal dari katalog API.

## 7. Bagaimana cara mengecek hasilnya?

Jalankan test Role dan seluruh test CMS, lint, typecheck, format check, build, Code Anti-Slop, dan UI Anti-Slop. Periksa juga halaman daftar, Create, dan Edit di browser pada desktop serta mobile.

## 8. Apa yang harus direview manusia?

Pastikan navigasi langsung dan guard benar, nilai Role dan permission edit terisi, aksi grup hanya mengubah permission grup terkait, layout tetap nyaman di layar kecil, serta API/RBAC tidak berubah.

## 9. Apa yang belum dikerjakan?

Review visual desktop/mobile belum bisa dilakukan. Server CMS berhasil berjalan, tetapi API lokal di `localhost:3000` tidak aktif sehingga browser diarahkan ke login sebelum halaman Role dapat diperiksa.
