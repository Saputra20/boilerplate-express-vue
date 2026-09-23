# be/24-ai-governance-audit — AI Governance Audit and Hardening

## Apa yang dibuat?

Kontrak untuk mengaudit dan merapikan panduan AI coding agent di `AGENTS.md`, `docs/`, dan `.codex/skills/`. Kontrak ini membedakan fakta implementasi saat ini, target yang sudah disetujui, pekerjaan yang ditunda, dan requirement yang belum diketahui.

## Kenapa dibuat?

Setelah module-first, API versioning, dan OpenAPI/Swagger memiliki kontrak baru, panduan lama mudah menjadi stale. Agent dapat mengira task `Ready` atau `Planned` sebagai fitur yang sudah berjalan, memakai path lama, atau memuat terlalu banyak skill yang tidak relevan.

## Apa yang berubah?

Task implementasi nantinya akan memperjelas authority, ownership dokumentasi, jalur hotfix terbatas, verifikasi status task melalui source dan evidence, aktivasi skill yang lebih selektif, serta aturan konsistensi untuk module-first, `/api/v1`, dan OpenAPI/Swagger.

## Apa yang tidak berubah?

Task ini tidak mengubah source aplikasi, test runtime, dependency, database, route, auth, Redis, BullMQ, Swagger runtime, atau perilaku API. Target be/21–23 tetap diklasifikasikan sebagai target sampai source dan evidence membuktikan implementasinya.

## Dependency task apa?

`be/23-versioned-openapi-swagger`. Dependency ini menjaga audit governance dilakukan setelah kontrak OpenAPI/Swagger versioned tersedia, tetapi audit tetap wajib memeriksa kondisi source sebenarnya.

## Risiko utama?

Risiko utama adalah dokumentasi yang menyatakan target sebagai fakta, snapshot skill yang menjadi sumber kebenaran palsu, hotfix yang meluas menjadi perubahan arsitektur, dan duplikasi aturan yang saling bertentangan. Risiko dikendalikan dengan classification matrix, authority winner, hard stop, dan consistency gate.

## Bagaimana cara mengecek hasilnya?

Inventarisasi semua docs, skills, references, task, manifest, dan source terkait. Bandingkan dengan aturan authority. Verifikasi path, status task, current route/OpenAPI state, diff, secret review, dan documentation Anti-Slop. Tidak perlu menjalankan test aplikasi karena runtime tidak berubah.

## Apa yang harus direview manusia?

Reviewer harus memastikan perubahan tidak mengambil keputusan produk, permission, security, compliance, API lifecycle, atau database secara diam-diam. Reviewer juga harus memeriksa apakah setiap aturan memiliki owner tunggal dan apakah hotfix exception tetap sempit.

## Apa yang belum dikerjakan?

Implementasi governance belum dijalankan. be/21, be/22, dan be/23 juga belum boleh dianggap selesai hanya dari task metadata; source dan evidence aktual tetap menentukan status.
