# be/18-health-readiness — Penjelasan

## Apa yang dibuat?

Task ini menambah dua endpoint operasional: `/health` untuk liveness proses dan `/ready` untuk kesiapan dependency.

## Kenapa dibuat?

Load balancer dan platform deployment perlu membedakan proses API yang masih hidup dari proses yang belum bisa melayani traffic bergantung database/Redis.

## Apa yang berubah?

- `/health` public, tanpa JWT/RBAC, dan hanya mengembalikan `200 { "status": "ok" }`.
- `/ready` juga public, mengecek PostgreSQL dan Redis secara bersamaan dengan batas dua detik per probe.
- Jika salah satu dependency gagal atau timeout, `/ready` mengembalikan `503 { "status": "not_ready" }`.
- Kedua route masuk OpenAPI sebagai endpoint operasional public.

## Apa yang tidak berubah?

- `/health` tidak mengecek PostgreSQL atau Redis.
- Tidak ada migration, environment variable baru, probe tulis, queue/worker health, atau endpoint diagnostic detail.
- `/ops/queues` tetap dashboard terpisah dan tidak berubah menjadi health endpoint.

## Dependency task apa?

Task ini menggunakan database, Redis, middleware keamanan, logging, dan fondasi OpenAPI yang sudah ada.

## Risiko utama?

Response readiness yang terlalu detail dapat membocorkan topology atau credential. Response public karena itu hanya memuat status; detail aman hanya masuk log internal yang sudah disanitasi.

## Bagaimana cara mengecek hasilnya?

Periksa `/health` saat dependency gagal: tetap `200`. Periksa `/ready`: `200` hanya bila PostgreSQL dan Redis lolos, selain itu `503`. Periksa OpenAPI dan test timeout/concurrency.

## Apa yang harus direview manusia?

Review bahwa endpoint public dan pengecualian rate limit hanya berlaku untuk `/health` serta `/ready`, bukan route lain.

## Apa yang belum dikerjakan?

Metrics, Kubernetes manifest, dashboard health, latency report, worker readiness, dan downstream business probe tetap di luar task ini.
