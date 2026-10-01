# be/40-authenticated-self-profile — Profil Mandiri Terautentikasi

## Apa yang dibuat?

Kontrak backend agar pengguna terautentikasi dapat membaca identitas profil melalui `/api/v1/me` dan mengubah `displayName` miliknya sendiri melalui `PATCH /api/v1/me`.

## Kenapa dibuat?

FE-26 belum dapat dibuat karena API hanya menyediakan konteks identitas dan endpoint administrasi user. FE tidak boleh memakai API admin untuk mengubah profil sendiri. Skema saat ini juga belum memiliki atribut profil non-keamanan yang disetujui untuk diedit.

## Apa yang berubah?

Task BE-40 menambahkan `displayName` nullable ke identitas, menetapkan aturan update 1–80 karakter setelah trim, mengharuskan identitas target berasal dari sesi terautentikasi, serta mencatat perubahan aktual dalam audit transaksional. `/me` tetap menjadi sumber identitas kanonis. Pengguna lama dapat memiliki nilai null sampai mengaturnya.

## Apa yang tidak berubah?

Email tetap read-only. Role, permission, status akun, password, avatar, dan atribut sistem tidak dapat diubah melalui API ini. Endpoint dan perilaku admin `/api/v1/users/*`, FE-24, FE-25, dan alur email tidak berubah. Task ini tidak mengimplementasikan UI FE-26.

## Dependency task apa?

Bergantung pada fondasi database, identitas, audit, arsitektur API, OpenAPI, konteks RBAC, administrasi user, dan enforcement perubahan password wajib yang tercantum di `technical.md`. Task ini memblokir FE-26 sampai implementasi dan validasinya selesai.

## Risiko utama?

Penambahan kolom dapat membocorkan atribut baru lewat serializer admin yang memakai hasil query penuh. Task mewajibkan response admin tetap sama. Rollback migrasi menghapus nilai display name yang dibuat setelah migrasi; dampak ini telah disetujui saat task direncanakan dan harus dibuktikan hanya pada database terisolasi.

## Bagaimana cara mengecek hasilnya?

Jalankan tes API, OpenAPI, audit, integrasi PostgreSQL, serta migrasi UP/DOWN/re-apply terisolasi. Lanjutkan dengan lint, typecheck, format, Code Anti-Slop, dan `git diff --check` sesuai `technical.md`.

## Apa yang harus direview manusia?

Pastikan hanya principal saat ini yang dapat mengubah profil; PATCH tetap diblokir selama `mustChangePassword` aktif; audit tidak menyimpan nilai lama/baru; dan bentuk response admin tidak berubah. Tinjau bukti rollback migrasi pada database disposable.

## Apa yang belum dikerjakan?

Belum ada implementasi backend ataupun UI. FE-26 dapat dimulai setelah BE-40 selesai dan bukti kontrak runtime tersedia. Email change, avatar, password, dan atribut profil lain tetap di luar scope.
