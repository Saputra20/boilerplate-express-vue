# be/07-security-foundation — Security Foundation

## Tujuan

Task ini menetapkan kontrak security middleware API supaya implementasi tidak lagi terblokir oleh default rate limit dan CORS yang belum jelas.

## Keputusan Yang Sudah Disetujui

- Helmet menambahkan baseline HTTP security headers.
- CORS hanya mengizinkan origin yang tercantum di konfigurasi tervalidasi. Wildcard tidak dipakai.
- Konfigurasi memakai `CORS_ORIGINS`, berisi satu atau lebih origin eksplisit. Contoh lokal adalah `http://localhost:5173` berdasarkan konfigurasi API yang sudah ada.
- CORS mengizinkan `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, dan `OPTIONS`, dengan header `Content-Type`, `Authorization`, dan `X-Request-Id`.
- Credential cross-origin dimatikan. Cookie/session lintas origin belum dipakai.
- Rate limit global awal adalah 100 request per 15 menit per IP. Request ke-101 mendapat `429` dengan respons aman.
- Endpoint login, reset password, refresh token, dan operasi sensitif akan memiliki limit lebih ketat melalui task terpisah.
- Batas JSON `1mb` tetap dipertahankan. Body terlalu besar dan JSON rusak ditolak secara aman.
- Error internal disanitasi; detail operasional hanya masuk ke Pino yang sudah memakai request correlation.
- Request ID dibuat server, bukan dipercaya dari header masuk yang arbitrer.
- Shutdown `SIGINT` dan `SIGTERM` menghentikan server lalu menutup resource yang sudah ada secara teratur.

## Batas Task

Task berikutnya hanya mengimplementasikan fondasi middleware ini. JWT, authentication, login, RBAC, session, CSRF token, cookie auth, Redis/distributed rate limiting, dan layanan keamanan cloud belum termasuk.

## Yang Perlu Direview Human

Pastikan origin production diberikan lewat deployment configuration, bukan hard-code. Review middleware order, exact origin matching, tidak adanya wildcard atau credentials, perilaku `429`, error tanpa detail internal, dan shutdown resource saat terminasi.

## Status

Blocker rate limit dan CORS sudah selesai. Task siap diimplementasikan; pembaruan ini tidak mengubah aplikasi atau middleware.
