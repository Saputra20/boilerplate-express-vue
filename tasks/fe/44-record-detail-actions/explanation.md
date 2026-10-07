# Action detail untuk Roles, Users, dan Audit Trail

## Apa yang dibuat?

Setiap baris pada tiga daftar mempunyai action View details yang jelas. Roles dan Users mendapat halaman detail yang bisa dibuka langsung lewat URL; Audit Trail memakai halaman detail yang sudah ada.

## Kenapa dibuat?

Saat ini pola detail berbeda: Roles belum punya halaman detail, Users memakai modal, dan Audit Trail hanya menautkan judul event. Satu pola navigasi membuat action lebih mudah ditemukan.

## Apa yang berubah?

Role dan User detail memakai halaman baca saja serta API yang sudah tersedia. Modal detail User diganti halaman. Kolom Actions di tiga daftar menampilkan action detail; event di tampilan mobile juga punya tautan detail yang jelas.

## Apa yang tidak berubah?

Izin backend, data API, filter, pagination, create/edit/delete, dan isi halaman detail Audit Trail tetap.

## Dependency task apa?

Implementasi Role, User, Audit Trail, serta halaman form khusus `fe/19` dan `fe/20`.

## Risiko utama?

Navigasi yang baru harus tetap aman bagi pengguna tanpa izin baca dan memberi jalan kembali saat detail tidak ditemukan atau API gagal.

## Bagaimana cara mengecek hasilnya?

Buka ketiga daftar, gunakan View details, lalu cek URL, isi detail, Back, refresh, keyboard, dan lebar mobile. Coba juga ID yang tidak ada dan kegagalan API.

## Apa yang harus direview manusia?

Keputusan visual action, urutan action di tabel, isi aman pada detail Role/User, dan kenyamanan navigasi kembali.

## Apa yang belum dikerjakan?

Tidak ada fitur edit/delete dari halaman detail atau perubahan pada API.
