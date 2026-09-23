# be/17-openapi — Penjelasan

## Apa yang dibuat?

Fondasi dokumentasi OpenAPI untuk API saat ini menyediakan Swagger UI di `/docs` dan dokumen JSON mentah di `/openapi.json`.

## Kenapa dibuat?

Developer dan alat integrasi memerlukan kontrak API yang dapat dibaca manusia maupun mesin. Satu dokumen yang dibuat saat startup mencegah daftar endpoint manual yang berbeda dari route sebenarnya.

## Apa yang berubah?

- Spesifikasi memakai OpenAPI `3.0.3`.
- Karena `apps/api/package.json` belum memiliki versi aplikasi, `info.version` memakai `0.1.0`.
- Dokumen memakai server relatif `/`, sehingga tidak mengunci localhost atau hostname deployment tertentu.
- Route login dan refresh didokumentasikan sebagai public. Logout dan logout-all memakai bearer JWT sesuai middleware yang sudah ada.
- Kontribusi OpenAPI tinggal dekat dengan module pemilik route, lalu didaftarkan eksplisit pada fondasi OpenAPI.

## Apa yang tidak berubah?

- `info.version` tidak mengubah URL menjadi `/v1` atau `/api/v1`.
- Tidak ada endpoint bisnis palsu, migration database, environment variable baru, atau desain Swagger UI kustom.
- `/ops/queues` tetap dashboard operasional Bull Board dan tidak masuk spesifikasi public.

## Dependency task apa?

Task ini memakai kontrak keamanan dan route auth dari fondasi security, JWT, login, refresh, logout, RBAC, serta aturan pengecualian queue monitor.

## Risiko utama?

Dokumentasi yang tidak cocok dengan route atau bocor secret dapat menyesatkan konsumen API. Karena itu dokumen hanya memuat route yang terbukti ada, memakai security per-route, dan diuji tanpa nilai credential nyata.

## Bagaimana cara mengecek hasilnya?

Periksa `/openapi.json` untuk versi `3.0.3`, server `/`, `bearerAuth`, route auth yang benar, dan tidak adanya `/ops/queues`. Buka `/docs` untuk Swagger UI bila browser tersedia.

## Apa yang harus direview manusia?

Review bahwa kontrak auth sesuai perilaku API sekarang dan bahwa endpoint dokumentasi boleh public di semua environment.

## Apa yang belum dikerjakan?

Business endpoint, URL API versioning, client generation, custom Swagger UI, serta kebijakan deployment yang membatasi dokumentasi tetap di luar task ini.
