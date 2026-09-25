# be/26-category-crud — Category CRUD

## Apa yang dibuat?

Kontrak eksekusi untuk modul backend `category`: tabel PostgreSQL, migration Drizzle, API CRUD versioned, validasi, soft delete, RBAC, OpenAPI, dan test.

## Kenapa dibuat?

Backend membutuhkan capability category yang mengikuti arsitektur module-first, memakai authorization backend, dan menyimpan data dengan lifecycle yang dapat direview serta di-rollback.

## Apa yang berubah?

Belum ada perubahan runtime. Dokumen ini menetapkan file yang perlu diperiksa, batas scope, alur request, kontrak database/API, test matrix, dan bukti completion yang diperlukan sebelum implementasi.

## Apa yang tidak berubah?

Auth, RBAC foundation, CMS, queue, Redis, audit, dependency, dan modul lain tidak berubah. Tidak ada category hierarchy, bulk operation, hard delete, atau UI CMS.

## Dependency task apa?

Task bergantung pada database foundation, identity schema, RBAC permissions, versioned OpenAPI, dan authenticated RBAC context yang sudah ada di repository.

## Risiko utama?

Kontrak publik belum lengkap. Route, pagination, batas field, normalisasi slug, cakupan uniqueness, perilaku delete berulang, dan sumber bootstrap permission harus disetujui agar implementer tidak mengarang behavior.

## Bagaimana cara mengecek hasilnya?

Setelah open points disetujui, jalankan test category dan regresi API, typecheck, lint, format check, validasi OpenAPI, migration UP/DOWN/RE-UP pada database terisolasi, Code Anti-Slop, dan `git diff --check`.

## Apa yang harus direview manusia?

Setujui semua open points di `technical.md`, terutama kontrak API publik, slug, pagination, soft delete, serta cara permission category masuk ke persisted RBAC catalog.

## Apa yang belum dikerjakan?

Implementasi source, migration, OpenAPI, test, dan perubahan runtime belum dikerjakan. Status tetap blocked untuk execution sampai keputusan kontrak disetujui.
