# be/27-role-crud — Kontrak Role CRUD

## Apa yang dibuat?

Kontrak Role CRUD backend sudah disetujui dan difinalkan. Dokumen ini menetapkan route, field yang mengikuti schema identity, lifecycle, validasi nama, authorization, proteksi role bootstrap, audit, dan batas implementasi.

## Kenapa dibuat?

Implementasi role menyentuh authorization, assignment user, dan audit keamanan. Kontrak perlu disepakati agar implementer tidak menambah field, permission, endpoint, atau perilaku delete secara diam-diam.

## Apa yang berubah?

`be/27` sekarang berstatus approved/finalized dan menunjuk ke successor `be/28-role-crud-implementation`. `code` tetap digunakan karena diwajibkan schema, nama harus trim dan unik, role yang masih dipakai user tidak boleh dihapus, dan permission assignment tetap terpisah.

## Apa yang tidak berubah?

Tidak ada perubahan production code, database migration, seed, OpenAPI, package, atau runtime. Tidak ada UI, User CRUD, Category CRUD, endpoint permission management, atau authentication baru.

## Dependency task apa?

Kontrak bergantung pada identity schema, RBAC permissions, audit trail, versioned OpenAPI, dan authenticated RBAC context. Successor juga membutuhkan catalog permission role yang belum tersedia di repository.

## Risiko utama?

Schema saat ini belum memiliki unique constraint untuk `roles.name`, sehingga successor harus menilai migration terfokus untuk menjamin uniqueness. Permission key role juga belum tersedia; route tidak boleh diaktifkan tanpa dependency catalog yang disetujui.

## Bagaimana cara mengecek hasilnya?

Reviewer memeriksa kontrak terhadap source schema, arsitektur module-first, RBAC middleware, audit service, dan konvensi API. Jalankan `git diff --check`, review task graph, dan pastikan file successor tersedia.

## Apa yang harus direview manusia?

Review authority conflict yang sudah dicatat: field `code` dari schema tetap dipakai, path implementasi menggunakan `src/modules/role/`, dan permission catalog role masih menjadi dependency eksplisit.

## Apa yang belum dikerjakan?

Production Role CRUD belum dibuat. Implementasinya akan dikerjakan terpisah melalui `be/28-role-crud-implementation` setelah dependency permission catalog tersedia.
