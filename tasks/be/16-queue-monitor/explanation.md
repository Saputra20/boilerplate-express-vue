# be/16-queue-monitor — Queue Monitor

## Apa yang dibuat?

Task ini menyiapkan dashboard Bull Board untuk melihat queue BullMQ `default` pada path `/ops/queues`.

## Kenapa dibuat?

Developer dan operator internal perlu melihat status queue tanpa menjadikannya fitur produk atau API publik.

## Perilaku utama

- Dashboard memakai `@bull-board/api` dan adapter Express `@bull-board/express`.
- Akses hanya untuk developer/operator tepercaya melalui HTTP Basic Auth dari environment.
- Ini bukan login JWT aplikasi dan bukan RBAC bisnis.
- Dashboard hanya baca. Retry, delete, promote, clean, pause/resume, dan operasi mutasi lain tidak tersedia.

## Keamanan

- Username dan password wajib dari environment, tervalidasi saat startup, dan tidak pernah dicatat di log.
- Karena tidak ada operasi mutasi, CSRF middleware belum diperlukan. Task masa depan yang mengaktifkan mutasi wajib mendefinisikan CSRF, otorisasi lebih kuat, dan audit.
- CORS tidak dibuat permisif. Helmet dan proteksi global tetap berlaku.
- Hanya queue `default` yang didaftarkan; queue Redis lain tidak dicari otomatis.

## Yang tidak berubah

Tidak ada CMS menu, public OpenAPI operation, database migration, queue bisnis, processor, JWT/RBAC monitor, atau dashboard kustom.

## Dependency dan review

Task bergantung pada Redis, security middleware, dan queue foundation yang sudah ada. Reviewer perlu memastikan Basic Auth berada sebelum router Bull Board, mode read-only benar-benar dikonfigurasi di server, serta dashboard dapat dibuka di browser bila capability tersedia.
