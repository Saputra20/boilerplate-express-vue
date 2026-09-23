# be/21-api-module-architecture-refactor — API Module Architecture Refactor

## Apa yang dibuat?

Kontrak implementasi untuk merapikan `apps/api/src` menjadi arsitektur module-first. Task ini belum memindahkan source atau mengubah perilaku API.

## Kenapa dibuat?

Task ini ditempatkan setelah `be/20-backend-quality-gate` supaya fondasi yang sudah ada dibuktikan stabil dulu. Struktur sekarang mencampur auth, audit, database, JWT, Redis, logger, password, dan middleware di level root. Kondisi itu membuat ownership fitur tidak jelas dan mudah menambah drift saat task backend berikutnya dibuat.

## Apa yang berubah?

Saat dieksekusi nanti, auth menjadi pemilik `modules/auth`; permission/RBAC menjadi `modules/rbac`; generic audit menjadi `modules/audit`; dan health/readiness menjadi `modules/health`. Middleware Express lintas fitur pindah ke `middleware`. Database, Redis, logger, JWT/key, environment, konfigurasi HTTP security, OpenAPI global, dan queue monitor pindah ke `config`. Password dan fingerprint refresh token yang stateless pindah ke `helpers`.

Kontrak sekarang memetakan seluruh 37 file source saat ini. Kontribusi OpenAPI auth dan health tetap dimiliki module masing-masing; agregasi dokumen OpenAPI global tetap infrastruktur konfigurasi.

`common` bukan tempat menaruh apa saja. Tidak ada source saat ini yang memenuhi syarat shared non-domain primitive, jadi task tidak akan membuat folder kosong atau placeholder.

## Apa yang tidak berubah?

API, database, migrasi, JWT claims, login, refresh, logout, session, RBAC, audit, Redis, logger, security middleware, environment, dan graceful shutdown tidak berubah. `/health`, `/ready`, `/docs`, `/openapi.json`, dan `/ops/queues` juga tidak berubah. Tidak ada endpoint RBAC/audit baru atau fitur backend berikutnya.

## Dependency task apa?

`be/20-backend-quality-gate` harus lulus lebih dulu. Setelah task ini selesai, task backend baru yang menambah atau memperluas source API wajib memakai struktur module-first ini.

## Risiko utama?

Risiko terbesar adalah import lama, circular dependency, atau pemecahan router/controller yang diam-diam mengubah validasi dan status HTTP. Kontrak ini memberi matriks migrasi untuk semua source file, target tree tetap, pencarian path lama, dan test regresi agar risiko terlihat sebelum selesai.

## Bagaimana cara mengecek hasilnya?

Bandingkan tree akhir dengan referensi target, cek setiap baris matriks migrasi, jalankan focused test lalu `bun run --cwd apps/api test`, lint, typecheck, format check, Code Anti-Slop, pencarian import lama, `git diff --check`, dan review diff penuh.

## Apa yang harus direview manusia?

Pastikan pemisahan ownership benar: domain di module, middleware hanya lintas HTTP, config tidak memanggil module bisnis, helper tidak memegang business logic, dan tidak ada perubahan perilaku yang terselip dalam pemindahan file.

## Apa yang belum dikerjakan?

Refactor belum dieksekusi. Run ini hanya memperbaiki kontrak dan referensi. Pemindahan file, perubahan import, update aturan/arsitektur/skill, dan validasi runtime memerlukan eksekusi implementasi terpisah.
