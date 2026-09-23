# be/11-refresh-token - Refresh Token Rotation

## Apa yang dibuat?

Task ini sekarang punya kontrak eksekusi untuk `POST /auth/refresh`, rotasi refresh token, deteksi replay, dan audit refresh.

## Kenapa dibuat?

Refresh token adalah credential jangka lebih panjang. Rotasi membuat setiap token hanya bisa dipakai sekali sehingga pemakaian ulang token lama dapat dianggap tanda compromise.

## Apa yang berubah?

- Refresh token dikirim melalui JSON body dan token pengganti kembali melalui JSON, sama seperti kontrak login.
- Setiap refresh sukses membuat access token dan refresh token baru dengan JTI baru, tetapi `sub` user dan `sid` session tetap sama.
- Token refresh lama dikonsumsi dan hanya boleh dipakai sekali.
- Reuse token lama merevoke session terkait saja; session lain milik user tidak ikut direvoke.
- Masa hidup session tidak diperpanjang. Expiry refresh token baru tidak boleh melewati expiry session awal.
- Database menambah lineage token dan vocabulary audit refresh yang fokus, bukan tabel refresh baru.

## Apa yang tidak berubah?

Raw refresh token tidak disimpan. Access token juga tidak disimpan. Cookie, CSRF, logout, revoke-all session, dan generic revocation tetap bukan scope task ini.

## Dependency task apa?

Task ini memakai JWT foundation dan login/session foundation, termasuk `auth_sessions`, `refresh_tokens`, audit, request ID, dan rate limit global.

## Risiko utama?

Rotasi harus atomik. Dua request memakai token sama tidak boleh menghasilkan dua token pengganti. Jika token lama dipakai ulang setelah rotasi, hanya session yang mungkin compromise yang direvoke dan respons publik tetap generik.

## Bagaimana cara mengecek hasilnya?

Review request/response, claim `sub`/`sid`/JTI, lineage, concurrent refresh, reuse, expiry cap, audit redaction, dan tidak adanya raw token di database/log. Jalankan migration UP/DOWN/re-apply terisolasi, lint, typecheck, test, `git diff --check`, dan Code Anti-Slop.

## Apa yang harus direview manusia?

Pastikan transport JSON tetap konsisten, session expiry tidak sliding, reuse tidak merevoke session lain, dan migrasi hanya menambah lineage/audit vocabulary yang diperlukan.

## Apa yang belum dikerjakan?

Implementasi refresh belum dibuat dalam pembaruan dokumen ini. Logout, revoke-all, dan general revocation API tetap task `be/12-logout-revocation`.
