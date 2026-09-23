# be/10-login-session - Login And Session

## Apa yang dibuat?

Task ini sekarang punya kontrak eksekusi untuk `POST /auth/login`, session, metadata refresh token, dan audit login yang tahan lama.

## Kenapa dibuat?

Login membutuhkan cara yang konsisten untuk memeriksa password, membuat session, menerbitkan token, dan menyimpan jejak audit tanpa membocorkan keadaan akun.

## Apa yang berubah?

- Login menerima email dan password melalui `POST /auth/login`.
- Hanya user aktif dan belum soft delete yang dapat login.
- User tidak ditemukan, password salah, akun disabled, dan akun deleted memberi respons publik `401` yang sama.
- Login sukses membuat session UUID, lalu access dan refresh token memakai user UUID sebagai `sub` dan session UUID sebagai `sid`.
- Raw refresh token tidak disimpan. Database hanya menyimpan hash SHA-256 token tersebut. Access token tidak disimpan.
- Setiap login sukses/gagal membuat event audit tanpa password atau token.

## Apa yang tidak berubah?

Task ini belum membuat refresh rotation, refresh endpoint, logout, revocation, RBAC, cookie token transport, registration, password reset, atau generic audit framework.

## Dependency task apa?

Task ini memakai users identity schema, JWT foundation, password hashing, security middleware, dan Drizzle transaction.

## Risiko utama?

Login tidak boleh membedakan alasan kegagalan secara publik. Session, refresh metadata, dan audit sukses harus tersimpan atomik sebelum token dikembalikan. Jika penyimpanan gagal, token tidak boleh dikirim.

## Bagaimana cara mengecek hasilnya?

Review test request valid/tidak valid, respons `401` seragam, session/token claim, tidak ada raw refresh/access token di database, audit redacted, dan failure atomicity. Jalankan migration UP/DOWN/re-apply, lint, typecheck, full test, `git diff --check`, dan Code Anti-Slop.

## Apa yang harus direview manusia?

Pastikan response login tetap minimal, account state tidak bocor, raw refresh token tidak disimpan, retention 30/90 hari sesuai kontrak, dan migration dipisah per entity.

## Apa yang belum dikerjakan?

Implementasi login belum dibuat dalam pembaruan dokumen ini. Refresh rotation, logout/revocation, generic audit trail, dan authorization tetap task berikutnya.
