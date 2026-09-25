# fe/18-tailadmin-visual-rework — TailAdmin Visual Rework

## Apa yang dibuat?

Kontrak rework visual CMS agar hasil browser benar-benar terlihat berbeda: sidebar, header, shell halaman, login, home, shared primitives, responsive drawer, state UI, dan dark mode.

## Kenapa dibuat?

`fe/13-tailadmin-ui-foundation` sudah membuat primitive reusable tetapi browser verification belum membuktikan kesetiaan visual dan perubahan material. Task ini fokus pada tampilan nyata, bukan refactor internal.

## Apa yang berubah?

Implementasi akan memperbarui token dan style aktual, shell, navigasi, header, login, home, card, button, form control, table, pagination, dropdown, modal, badge, dan loading/empty/error state dengan arah TailAdmin-inspired.

## Apa yang tidak berubah?

Auth, API, Router, Pinia, backend RBAC, permission vocabulary, dan kontrak bisnis tidak berubah. Tidak ada fake metric, CRUD baru, dependency baru, atau TailAdmin architecture copy.

## Dependency task apa?

Task memakai hasil `fe/13-tailadmin-ui-foundation` dan quality gate `fe/12-frontend-quality-gate`.

## Risiko utama?

Perubahan dapat terlihat kosmetik tetapi tidak material, mobile drawer dapat tidak usable, atau dark mode dapat menyisakan komponen light. Browser evidence wajib; test/lint/typecheck saja tidak cukup.

## Bagaimana cara mengecek hasilnya?

Jalankan test, lint, typecheck, build, Code Anti-Slop, UI Anti-Slop, accessibility/responsive audit, lalu inspeksi browser sebelum/sesudah pada desktop, tablet, mobile, dan light/dark state yang didukung.

## Apa yang harus direview manusia?

Review apakah CMS benar-benar tampak berbeda dari foundation lama, hierarchy dan spacing konsisten, sidebar mobile usable, dark mode lengkap, dan tidak ada fake content atau auth/RBAC regression.

## Apa yang belum dikerjakan?

Source code belum diubah. Browser renderer dan exact visual reference state masih perlu dikonfirmasi sebelum final acceptance.

