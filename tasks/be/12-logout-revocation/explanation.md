# be/12-logout-revocation — Logout And Revocation

## Apa yang Dibuat

Task ini sekarang memiliki kontrak untuk dua aksi logout backend: `POST /auth/logout` untuk session saat ini, dan `POST /auth/logout-all` untuk seluruh session/device milik user yang sedang login.

## Kenapa Dibutuhkan

Logout tidak cukup hanya menghapus token di client. Session perlu dicabut di server agar refresh token terkait tidak dapat dipakai lagi dan access token yang masih hidup dapat ditolak.

## Apa yang Berubah

- Kedua endpoint membutuhkan access token yang valid.
- Logout biasa hanya mencabut session saat ini. Logout semua device harus memakai endpoint terpisah.
- `auth_sessions.revoked_at` menjadi sumber utama status pencabutan session.
- Refresh token pada session yang dicabut ikut tidak valid, tetapi riwayatnya tidak dihapus karena masih dibutuhkan untuk deteksi reuse.
- JTI access token saat ini dapat dicatat sampai token tersebut kedaluwarsa. Raw JWT tidak pernah disimpan.
- Middleware autentikasi harus mengecek session dan JTI yang sudah dicabut.
- Event audit logout dicatat tanpa password, token, header Authorization, atau secret.

## Apa yang Tidak Berubah

Task ini tidak membuat login, refresh rotation, RBAC, UI session, logout user lain, admin revoke, cookie transport, OAuth, atau MFA.

## Dependency

Implementasi tetap menunggu bukti validasi nyata dari `be/05-redis-foundation` dan `be/11-refresh-token`. Khusus `be/11`, validasi PostgreSQL terisolasi untuk migration dan refresh concurrency masih harus lulus.

## Risiko Utama

Jika tabel revocation hanya disimpan tetapi tidak diperiksa middleware, logout menjadi palsu. Jika logout biasa mencabut semua session, perilaku device user menjadi salah. Jika raw token disimpan, credential bocor.

## Cara Mengecek Hasil

Saat implementasi diizinkan: jalankan focused test logout, test PostgreSQL terisolasi untuk migration/transaction, lint, typecheck, full test, Code Anti-Slop, dan `git diff --check`.

## Yang Perlu Direview Human

Pastikan logout biasa tetap hanya session saat ini, logout-all hanya user saat ini, error publik tidak membocorkan status session/token, dan dependency evidence benar-benar sudah lulus sebelum kode dibuat.

## Yang Belum Dikerjakan

Kode logout/revocation belum dibuat. Kontrak sudah siap, tetapi eksekusi diblokir sampai evidence dependency selesai.
