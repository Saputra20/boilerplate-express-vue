# be/04-identity-schema: Identity Schema

## Apa yang dibuat?

Kontrak task sekarang siap untuk fondasi `users`, `roles`, `permissions`, `user_roles`, dan `role_permissions`.

## Kenapa dibuat?

Blocker schema sudah selesai. Implementer tidak perlu menebak identifier user, password, soft delete, relasi RBAC, constraint, index, atau urutan migration.

## Apa yang berubah?

- `email` menjadi identifier login awal dan wajib lowercase sebelum disimpan.
- Password hanya berada di `password_hash` sebagai hash Argon2id.
- User memakai status `active` atau `disabled` dan soft delete melalui `deleted_at`.
- RBAC memakai `user → role → permission`; tidak ada `isAdmin`.
- Migration dibuat per entity atau relasi, bukan satu migration besar.
- Setiap migration punya UP dan DOWN; rollback mengikuti urutan foreign key terbalik.

## Apa yang tidak berubah?

Task ini belum membuat login, register, JWT, refresh token, session, reset password, email verification, middleware authorization, seed permission, atau UI RBAC.

## Dependency task apa?

`be/03-database-foundation` menyediakan konfigurasi dan lifecycle database. Task ini tetap sebelum `be/05-redis-foundation`.

## Risiko utama?

Drizzle saat ini hanya memiliki perintah migration forward. Implementasi harus membuktikan file rollback pendamping tidak mengganggu Drizzle dan menjalankan rollback pada database uji terisolasi.

## Bagaimana cara mengecek hasilnya?

Generate migration, jalankan UP, uji constraint dan foreign key, jalankan DOWN terbalik, pastikan schema kembali, lalu jalankan UP lagi. Jalankan lint, typecheck, test, Code Anti-Slop, dan `git diff --check`.

## Apa yang harus direview manusia?

Pastikan kolom sesuai kontrak, password bukan plaintext, email lowercase, soft delete tidak berubah menjadi hard delete, cascade hanya pada junction table saat hard delete, dan tiap migration punya rollback aman.

## Apa yang belum dikerjakan?

Schema dan migration belum diimplementasikan. Fitur auth dan authorization tetap berada di task berikutnya.
