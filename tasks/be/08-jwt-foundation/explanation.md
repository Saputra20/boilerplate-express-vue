# be/08-jwt-foundation - JWT Foundation

## Apa yang dibuat?

Task ini sekarang punya kontrak eksekusi untuk fondasi JWT. Fondasi ini memuat key RS256, membuat token access/refresh, dan memverifikasi signature serta claim yang disetujui.

## Kenapa dibuat?

Login dan endpoint auth berikutnya perlu identitas token yang konsisten. Kontrak ini menetapkan identitas user, tipe token, dan batas claim sebelum kode JWT dibuat.

## Apa yang berubah?

- `sub` selalu UUID dari `users.id`.
- `sub` bukan session ID, email, username, atau role ID.
- Session ID nanti dapat memakai `sid` jika task session yang disetujui membutuhkannya.
- Token memakai `typ=access` atau `typ=refresh`; verifier harus menolak tipe yang salah.
- Setiap token mendapat JTI UUID baru.
- Claim hanya memuat identitas dan data teknis minimum. Role dan permission tidak masuk ke token foundation.
- RS256, issuer, audience, masa berlaku, dan `nbf` bila ada wajib divalidasi.

## Apa yang tidak berubah?

Task ini belum membuat login, register, password verification, refresh rotation, session persistence, token revocation, logout, atau authorization middleware. Backend tetap menjadi sumber keputusan authorization melalui user, role, permission, dan action.

## Dependency task apa?

Task bergantung pada environment validation, identity schema `users.id`, dan security foundation.

## Risiko utama?

Key, token, dan claim tidak boleh bocor ke log atau error. Key yang tidak dapat dibaca atau token yang tidak valid harus gagal aman dan tidak membuat API berjalan dalam kondisi JWT tidak aman.

## Bagaimana cara mengecek hasilnya?

Review test JWT untuk access/refresh token, tipe token yang salah, signature/issuer/audience/masa berlaku, JTI, `sub`, dan error aman. Lalu jalankan lint, typecheck, seluruh test API, `git diff --check`, dan Code Anti-Slop.

## Apa yang harus direview manusia?

Pastikan `sub` tetap berarti UUID user, `sid` tidak dipakai sebelum task session, claim tidak membawa role/permission, dan scope tidak masuk ke login atau session management.

## Apa yang belum dikerjakan?

Implementasi JWT belum dibuat dalam pembaruan dokumen ini. Session persistence, refresh rotation, revocation, login, dan authorization tetap task berikutnya.
