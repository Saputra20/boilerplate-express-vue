# be/23-versioned-openapi-swagger — Versioned OpenAPI and Swagger

## Apa yang dibuat?

Kontrak API v1 dipindahkan ke YAML dekat module pemiliknya. Infrastruktur global memuat dan memvalidasi dokumen, menyajikan `/openapi/v1.json`, Swagger UI di `/docs/v1`, dan redirect `/docs` ke `/docs/v1`.

## Kenapa dibuat?

Swagger dipakai sebagai surface testing API berbasis browser. Developer dapat mencoba request, melihat schema dan status code, login, memakai `Authorize` dengan bearer token, lalu menguji endpoint protected tanpa menjadikan Postman sebagai infrastruktur project.

## Apa yang berubah?

Kontrak Auth v1 dan Health ditulis dalam YAML di dekat module. Infrastruktur global hanya memuat, resolve, validate, aggregate, dan serve dokumen. Security scheme JWT, operation ID, tag, schema naming, public/protected security, dan route exclusion dibuat eksplisit.

## Apa yang tidak berubah?

Task ini belum membuat v2, belum mengubah business route, service, repository, database, auth behavior, health/readiness behavior, atau queue monitor. `/health`, `/ready`, dan `/ops/queues` tetap non-versioned. Tidak ada migrasi database.

## Dependency task apa?

`be/22-api-versioning-foundation` harus selesai lebih dulu karena route Auth v1 dan mount boundary `/api/v1/auth` menjadi dasar dokumen OpenAPI v1.

## Risiko utama?

Risiko utama adalah YAML berbeda dari Express route, security declaration salah, Swagger UI memakai dokumen yang salah, atau TypeScript dan YAML menyimpan kontrak ganda. Kontrak mewajibkan validator, contract tests, browser verification, dan penghapusan source TypeScript lama setelah migrasi.

## Bagaimana cara mengecek hasilnya?

Jalankan focused spec/serving tests, full API suite, YAML/OpenAPI validator, lint, typecheck, format check, Code Anti-Slop, secret review, dan functional Swagger fallback validation. Jika browser tersedia, verifikasi `/docs`, `/docs/v1`, Auth, Health, Try it out, serta Authorize secara interaktif/visual. Jika browser tidak tersedia, laporkan `Browser verification: NOT RUN — browser capability unavailable in execution environment`; fallback HTTP/spec/configuration tetap wajib lulus.

## Apa yang harus direview manusia?

Pastikan YAML tetap dekat module, global config hanya menjadi aggregator/serving layer, public route tidak diberi bearer security secara tidak sengaja, `/ops/queues` tidak masuk JSON API, dan `info.version` tidak disamakan dengan major URL version.

## Apa yang belum dikerjakan?

Browser verification belum dapat dijalankan karena environment tidak menyediakan browser automation atau browser binary; kondisi ini tidak memblokir completion bila fallback validation lulus. Visual layout, Authorize button yang diamati secara visual, klik Try it out manual, dan rendered fields tetap `NOT RUN — browser capability unavailable`. v2, coexistence runtime v2, versioned OpenAPI v2, deprecation, dan removal v1 juga belum dikerjakan.
