# be/22-api-versioning-foundation — API Versioning Foundation

## Apa yang dibuat?

Kontrak implementasi untuk menyiapkan API business route pertama pada `/api/v1`. Auth akan memiliki router v1 sendiri, tetapi service dan repository tetap dipakai bersama. Task ini belum membuat v2 dan belum mengubah Swagger/OpenAPI menjadi versioned.

## Kenapa dibuat?

Komposisi sekarang membuat `server.ts` merakit banyak service/repository auth satu per satu, sementara `app.ts` menerima dependency auth melalui parameter positional. Route auth juga masih memakai `/auth/*` langsung. Bentuk ini membuat penambahan versi berikutnya mudah menghasilkan duplikasi dan ketergantungan yang tidak jelas.

## Apa yang berubah?

Versioning ditempatkan pada transport boundary: router, controller, validation, dan dokumentasi path dapat version-specific. `server.ts` membuat auth module, `app.ts` memasang router v1 pada `/api/v1/auth`, dan router memakai path relatif seperti `/login`. Route auth lama dipindahkan ke `/api/v1/auth/*` tanpa duplicate legacy route.

## Apa yang tidak berubah?

Service, repository, database, JWT, session, RBAC, audit, authentication, dan authorization tidak dibuat versi baru hanya karena URL berubah. `/health`, `/ready`, `/docs`, `/openapi.json`, dan `/ops/queues` tetap berada di luar namespace business API. Tidak ada schema, migration, atau v2.

## Dependency task apa?

`be/21-api-module-architecture-refactor` harus selesai lebih dulu karena task ini bergantung pada `modules/auth`, `middleware`, `config`, dan module-first ownership.

## Risiko utama?

Risiko utama adalah perubahan path yang tidak sinkron antara router, app, test, dan OpenAPI, atau pemindahan tanggung jawab business logic ke layer versi. Risiko dikendalikan dengan mount prefix tunggal, router-relative paths, regression test, dan larangan duplicate legacy routes.

## Bagaimana cara mengecek hasilnya?

Jalankan focused auth/composition tests, health/readiness, OpenAPI, dan queue-monitor tests. Jalankan full API suite, lint, typecheck, format check, Code Anti-Slop, legacy-route search, `git diff --check`, dan review diff/secrets.

## Apa yang harus direview manusia?

Pastikan `server.ts` hanya menjadi composition root, `app.ts` hanya mengetahui router module, auth router tidak menyimpan prefix global, dan service/repository tetap shared. Pastikan operational routes tidak masuk `/api/v1` dan tidak ada v2 palsu.

## Apa yang belum dikerjakan?

Versioned Swagger/OpenAPI, v2, deprecation, dan retirement v1 belum dikerjakan. Pekerjaan OpenAPI versioning diteruskan ke `be/23-versioned-openapi-swagger`.
