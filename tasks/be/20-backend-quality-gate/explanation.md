# be/20-backend-quality-gate — Penjelasan

## Apa yang dibuat?

Task ini menetapkan kontrak quality gate backend yang dapat dijalankan dan dilaporkan secara konsisten. Ini bukan fitur runtime aplikasi.

## Kenapa dibuat?

Lint, typecheck, dan test tidak membuktikan semua masalah kualitas. Code Anti-Slop adalah pemeriksaan terpisah terhadap diff nyata, termasuk abstraksi spekulatif, duplikasi, kode mati, TODO tersembunyi, dan perubahan di luar scope.

## Apa yang berubah?

- Urutan quality gate sekarang jelas: cek dependency, focused test, audit Anti-Slop, perbaikan dan audit ulang, lint, typecheck, full test, validasi kondisional, lalu review diff dan secret.
- Anti-Slop memakai skill lokal proyek. Tidak ada satu perintah CLI yang dipaksakan bila skill tidak mendokumentasikan perintah tersebut.
- PASS Anti-Slop harus berasal dari skill yang berhasil dimuat, audit yang benar-benar dijalankan, temuan yang ditangani, dan tidak ada temuan blocking.
- Focused test memberi umpan balik cepat; full test tetap wajib sebagai regresi akhir.
- Validasi migrasi, OpenAPI, dan browser hanya berjalan bila jenis task memang membutuhkannya.
- Review final diff dan secret wajib. `NOT RUN` tidak boleh dianggap `PASS`.

## Apa yang tidak berubah?

Tidak ada route, API, database, migration, dependency, CI baru, target coverage angka, atau perubahan runtime aplikasi.

## Dependency task apa?

`be/20` tetap bergantung pada `be/19-backend-testing`. Saat ini be/19 masih berstatus `Planned — not executed`, sehingga kontrak be/20 sudah jelas tetapi eksekusinya tetap diblokir.

## Risiko utama?

Risiko terbesar adalah laporan selesai yang tidak jujur: misalnya Anti-Slop dianggap lulus hanya karena lint atau test lulus. Kontrak ini melarang penggantian bukti seperti itu.

## Bagaimana cara mengecek hasilnya?

Review kontrak untuk memastikan urutan gate, bukti Anti-Slop, status PASS/FAIL/NOT RUN, perbedaan focused/full test, dan validasi kondisional sudah jelas. Saat task dieksekusi nanti, gunakan script API yang memang tersedia untuk lint, typecheck, dan test; lakukan review diff serta secret nyata.

## Apa yang harus direview manusia?

Pastikan be/19 benar-benar COMPLETE sebelum membuka eksekusi be/20. Pastikan laporan akhir menyebut bukti audit Anti-Slop yang benar-benar dijalankan, bukan asumsi dari gate lain.

## Apa yang belum dikerjakan?

Implementasi behavior quality gate belum dimulai. `be/21-api-module-architecture-refactor` juga tetap di luar scope sampai be/20 lulus.
