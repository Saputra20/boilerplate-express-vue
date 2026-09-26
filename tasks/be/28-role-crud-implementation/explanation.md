# be/28-role-crud-implementation — Implementasi Role CRUD

## Apa yang dibuat?

Task implementasi untuk membuat modul Role CRUD backend di `apps/api/src/modules/role/`. Modul menyediakan list, detail, create, update, dan delete role dengan authentication, authorization RBAC, validasi, proteksi role bootstrap, pengecekan assignment user, dan audit.

## Kenapa dibuat?

Kontrak `be/27-role-crud` sudah disetujui. Task ini memisahkan pekerjaan runtime dari task perencanaan agar perubahan route, database, authorization, dan audit bisa direview sebagai satu diff yang terukur.

## Apa yang berubah?

Implementer akan menambah router, controller, service, repository, validation/types, OpenAPI, dan test sesuai kontrak. Migration hanya boleh ditambahkan jika uniqueness `roles.name` benar-benar memerlukannya.

## Apa yang tidak berubah?

Tidak ada Role-Permission assignment API, permission management, User CRUD, Category CRUD, frontend, authentication redesign, JWT role claims, soft delete, atau penghapusan assignment user secara diam-diam.

## Dependency task apa?

Task bergantung pada approved `be/27-role-crud`, identity schema, RBAC middleware, audit trail, authenticated context, versioned OpenAPI, serta catalog permission role yang belum tersedia di repository.

## Risiko utama?

Permission key role belum ada sehingga route harus tetap fail-closed sampai dependency catalog disetujui. Schema juga belum memiliki unique constraint nama role; implementer harus membuktikan apakah migration terfokus dibutuhkan untuk race-safe uniqueness.

## Bagaimana cara mengecek hasilnya?

Jalankan format check, lint, typecheck, focused Role CRUD tests, full API tests, OpenAPI validation, `git diff --check`, dan migration UP/DOWN/re-apply bila migration nama ditambahkan. Review juga audit rollback dan protected-role behavior.

## Apa yang harus direview manusia?

Reviewer perlu memeriksa exact permission keys dari dependency catalog, keputusan migration unique name, status sukses DELETE, dan bukti bahwa role yang masih assigned tidak terhapus atau melepaskan assignment.

## Apa yang belum dikerjakan?

Belum ada production Role CRUD code. Task ini hanya menjadi execution contract untuk implementasi setelah seluruh dependency blocking tersedia.
