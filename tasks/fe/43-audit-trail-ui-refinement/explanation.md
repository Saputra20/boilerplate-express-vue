# fe/43-audit-trail-ui-refinement — Penyegaran Tampilan Audit Trail

## Apa yang dibuat?

Task FE untuk merapikan hierarki, copy, filter, daftar event, dan halaman detail Audit Trail yang sudah ada agar terasa spesifik dan mudah dipindai.

## Kenapa dibuat?

Screenshot yang diberikan menunjukkan judul berulang, deskripsi yang menyebut implementasi internal, dan panel filter yang terasa berat. Task ini mengarahkan perbaikan pada tampilan nyata sambil mengikuti kontrak audit yang sudah disetujui.

## Apa yang berubah?

Implementasi akan memperjelas satu judul utama, mengganti copy teknis dengan penjelasan yang berguna, mengelompokkan filter, meningkatkan keterbacaan hasil dan detail, serta menyesuaikan halaman untuk layar kecil. Semua filter yang disetujui tetap tersedia. Pagination mempertahankan pilihan 10, 20, 50, dan 100 dengan default 10, sesuai klarifikasi pemilik dan implementasi API saat ini.

## Apa yang tidak berubah?

API, RBAC, permission, jenis event, data yang ditampilkan, makna filter, cursor pagination, dan proses export tidak berubah. Ada perbedaan dokumentasi: `QUERY-001` masih menyebut default 20 dan hanya 20/50/100, sedangkan klarifikasi pemilik serta API/OpenAPI saat ini menetapkan default 10 dan mendukung 10/20/50/100. Task ini mengikuti klarifikasi terbaru; pembaruan dokumen approval upstream belum termasuk. Tidak ada data contoh, total palsu, chart, atau klaim audit yang tidak didukung.

## Dependency task apa?

Task memakai persyaratan yang disetujui pada `be/41-audit-trail`, kualitas FE dari `fe/12-frontend-quality-gate`, dan pola UI dari `fe/13-tailadmin-ui-foundation`. API audit yang sudah ada harus diperiksa kembali sebelum implementasi.

## Risiko utama?

Perapian tampilan bisa menghilangkan filter atau mengubah cara query bekerja. Kontrak meminta semua filter tetap tersedia; Actor ID harus tetap berbeda dari pencarian nama/target. Pemeriksaan browser diperlukan agar perbaikan bukan hanya perubahan kelas CSS.

## Bagaimana cara mengecek hasilnya?

Jalankan test CMS, format check, lint, typecheck, build, Anti-Slop code/UI, audit copy, aksesibilitas, dan responsive. Periksa list dan detail di browser pada desktop dan mobile serta state berisi, kosong, dan gagal/ditolak.

## Apa yang harus direview manusia?

Pastikan halaman terasa lebih terarah dan ringkas, filter tetap mudah ditemukan, pagination ber-default 10, informasi event nyata tetap lengkap, dan tidak muncul data atau ringkasan yang dibuat-buat.

## Apa yang belum dikerjakan?

Belum ada perubahan source code. Task ini hanya menambahkan kontrak implementasi FE; bukti visual dan hasil validasi baru dapat dibuat saat implementasi.
