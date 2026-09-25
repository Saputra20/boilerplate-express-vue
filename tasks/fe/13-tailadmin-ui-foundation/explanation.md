# fe/13-tailadmin-ui-foundation — TailAdmin UI Foundation

Task ini memisahkan dan mengimplementasikan foundation visual TailAdmin dari fitur bisnis CRUD.

## Yang Dibuat

Foundation akan mencakup login, shell CMS, sidebar, header, breadcrumb, page header, primitive form/table/modal, state loading/empty/error, responsive layout, dan dark mode yang kompatibel dengan fondasi saat ini.

Implementasi sekarang menambahkan shared UI primitives di `apps/cms/src/components/ui/`, memakai primitive tersebut pada Home/Login, dan mempertahankan auth, Router, Pinia, API, serta RBAC.

## Yang Tidak Dibuat

Tidak ada endpoint, permission baru, data dashboard palsu, halaman Category/Role/User, atau perubahan backend.

## Dependency

`fe/12-frontend-quality-gate` selesai. Fitur CRUD dan metric dashboard menunggu task backend masing-masing.

## Review Manusia

Reviewer memeriksa kesetiaan visual terhadap TailAdmin Vue, auth/RBAC tidak berubah, mobile keyboard behavior, dan status browser verification.

Automated validation lulus: 54 test, lint, typecheck, build, dan `git diff --check`. Browser side-by-side verification masih `NOT RUN — browser renderer unavailable`.
