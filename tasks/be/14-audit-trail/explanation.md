# be/14-audit-trail — Audit Trail

## Tujuan

Task ini membuat fondasi audit trail generik yang durable untuk event keamanan atau bisnis yang disetujui task pemiliknya.

## Apa yang Berubah

- Tabel generik `audit_events` dibuat terpisah dari `auth_audit_events`.
- `auth_audit_events` tetap dipakai login, refresh, dan logout. Tidak ada migrasi data lama atau dual-write otomatis.
- Nama event memakai format machine-readable, misalnya `rbac.permission.denied`.
- Metadata harus dibuat eksplisit, JSON aman, dibatasi 8 KB, dan tidak boleh memuat password, secret, token, cookie, header Authorization, atau payload mentah.
- Retention awal audit generik adalah 90 hari. Baris lama boleh dibersihkan oleh boundary internal, tetapi scheduler belum dibuat.

## Kebijakan Tulis

Untuk perubahan keamanan/state yang kontraknya mewajibkan audit, insert audit dan perubahan state memakai transaksi yang sama. Jika audit gagal, operasi gagal. Event informasional boleh best-effort hanya bila task pemiliknya menyetujuinya; kegagalan dicatat aman tanpa metadata dan tanpa audit berulang.

## Yang Tidak Dikerjakan

- API atau UI untuk membaca audit.
- Permission `audit.read`, export, SIEM, scheduler BullMQ, atau katalog event bisnis besar.
- Perubahan tabel atau perilaku `auth_audit_events`.

## Dependency

`be/03-database-foundation`, `be/06-logging-foundation`, dan fondasi auth/RBAC yang sudah ada.

## Cara Verifikasi

Jalankan test metadata, transaksi, retention, dan migrasi PostgreSQL UP/DOWN/re-UP; lalu format, lint, typecheck, test API, `git diff --check`, dan Code Anti-Slop.

## Review Human

Review batas metadata, retention 90 hari, pemisahan `auth_audit_events`, dan penggunaan fail-closed hanya untuk event security/state yang benar-benar wajib.

## Yang Belum Dikerjakan

Audit viewer/API, akses RBAC audit, dan scheduler cleanup tetap task berikutnya.
