# fe/20-user-form-dedicated-page — Halaman Form User Terpisah

## 1. Apa yang dibuat?

Task ini membuat halaman khusus untuk membuat dan mengedit User, mengikuti pola halaman Create/Edit Role.

## 2. Kenapa dibuat?

Form User saat ini masih berada di modal daftar. Halaman tersendiri memberi ruang untuk memilih satu Role dan mengubah status tanpa mengubah alur bisnis User.

## 3. Apa yang berubah?

Menu Users sekarang memiliki halaman `/users/create` dan `/users/:id/edit`. Tombol Add/Edit membuka halaman tersebut. Daftar User tetap menyediakan detail dan konfirmasi hapus. Form Create mengirim email dan satu Role tanpa password; form Edit memakai operasi `PUT` yang sudah ada.

## 4. Apa yang tidak berubah?

API User, izin akses, status `active`/`disabled`, assignment satu Role, password default server, kewajiban ganti password pada login pertama, serta perilaku detail dan hapus tetap mengikuti implementasi saat ini.

## 5. Dependency task apa?

Task memakai `fe/13-tailadmin-ui-foundation`, UI/API User yang ada di `fe/16-user-management`, dan kontrak serta implementasi backend `be/28-user-management`. `fe/19-role-form-dedicated-page` menjadi referensi tampilan, bukan dependency runtime.

## 6. Risiko utama?

Route halaman baru bisa salah memakai permission; detail User dan pilihan Role juga memakai izin baca tersendiri. Selain itu perubahan email saat ini belum mengirim email verifikasi. Task ini tidak boleh mengubah aturan backend atau menyatakan email verifikasi sudah terkirim.

## 7. Bagaimana cara mengecek hasilnya?

Test fokus lulus 29 test, seluruh suite CMS lulus 103 test, dan lint, typecheck, format check, serta build lulus. Frontend berhasil dibuka, tetapi route Create diarahkan ke login. API lokal `127.0.0.1:3000` tidak tersedia dan tidak ada fixture auth dev yang sudah ada, sehingga review browser desktop/mobile belum dapat dilakukan.

## 8. Apa yang harus direview manusia?

Pastikan kedua route memakai guard yang benar, form hanya memilih satu Role, payload Create tidak mengandung password, Edit memakai `PUT`, kartu mengisi lebar konten, dan detail/hapus pada daftar tetap bekerja.

## 9. Apa yang belum dikerjakan?

Pemeriksaan visual browser desktop/mobile masih tertunda sampai API dan sesi autentikasi tersedia. Perilaku verifikasi setelah email User diubah masih perlu diselaraskan pada task backend/email tersendiri; perubahan ini tidak mengubah atau mengklaim pengiriman email verifikasi.
