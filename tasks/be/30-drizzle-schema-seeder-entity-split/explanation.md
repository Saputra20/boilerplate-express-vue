# be/30-drizzle-schema-seeder-entity-split — Pemisahan Schema Drizzle dan Seeder per Entitas

## Apa yang dibuat?

Task ini memisahkan definisi 11 tabel Drizzle ke file per entitas/relasi, satu `schema/index.ts` sebagai aggregator, dan fungsi seed kecil untuk tanggung jawab bootstrap admin yang memang sudah ada. `db-seed.ts` tetap menjadi satu perintah utama yang mengatur urutan, satu transaksi, dan lifecycle database.

## Kenapa dibuat?

File schema dan seeder saat ini terpusat. Pemisahan akan memudahkan penelusuran, membuat file schema lebih kecil, memperjelas ownership, mempermudah review perubahan, membantu migrasi masa depan tetap fokus per entitas, dan mempermudah debugging seeder. Ini hanya refactor organisasi kode; bukan desain ulang database.

## Apa yang berubah?

Definisi tabel dipindahkan tanpa mengubah semantik. Import runtime dan Drizzle Kit diarahkan ke aggregator. Seed tanggung jawab admin dipisah ke modul yang bermakna, lalu dipanggil berurutan oleh `db-seed.ts` dalam satu transaksi.

## Apa yang tidak berubah?

Tidak ada perubahan kolom, tipe, constraint, FK, index, nilai seed, urutan seed, idempotency, transaksi, keamanan password, API, autentikasi, RBAC, migrasi, data, atau behavior aplikasi. Refactor ini tidak membuat migration SQL.

## Dependency task apa?

Task ini mengikuti `be/21-api-module-architecture-refactor`, yang menempatkan infrastruktur Drizzle di `apps/api/src/config/drizzle/`. Tidak ada successor yang diketahui diblokir oleh task ini.

## Risiko utama?

Risiko utamanya adalah FK lintas-file membuat import cycle, index tidak mengekspor tabel lengkap, Drizzle Kit mendeteksi schema drift, atau pemecahan seed mengubah urutan/rollback/idempotency. Task mewajibkan schema diff kosong dan bukti seed dijalankan ulang serta rollback.

## Bagaimana cara mengecek hasilnya?

Validasi yang sudah dijalankan: format check, lint, typecheck, seluruh test API, test seed integrasi pada database API_TEST terisolasi, schema import test, migration diff tanpa menyentuh history, dan `git diff --check`. API tidak memiliki build script. Test integrasi membuktikan rollback dan dua kali seed tanpa perubahan data tak diinginkan.

## Apa yang harus direview manusia?

Pastikan setiap tabel hanya memiliki satu definisi, semua file schema diekspor, ownership file tepat, urutan seed tetap sama, transaksi tetap satu, perilaku conflict tetap sama, dan tidak ada migration/schema/database behavior yang berubah.

## Apa yang belum dikerjakan?

Tidak ada pekerjaan tersisa dalam scope task. API behavior, data/schema, migration, dan UI tidak berubah.
