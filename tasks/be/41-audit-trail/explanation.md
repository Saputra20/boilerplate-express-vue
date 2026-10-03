# be/41-audit-trail: Perencanaan Lanjutan Audit Trail

## Apa yang dibuat?

Kontrak requirement Audit Trail fase 1 yang memakai fondasi audit yang sudah ada. Keputusan Saputra sebagai project owner/requester dicatat dengan ID stabil di `references/approved-requirements.md`, lalu pekerjaan tetap dibagi ke Backend, Frontend, Reviewer, dan QA.

## Kenapa dibuat?

Repository sudah memiliki `audit_events` dan tabel terpisah `auth_audit_events`, tetapi belum memiliki kontrak pembaca, export, snapshot aktor, perubahan before/after, atau retention otomatis. Artifact approval mengunci perilaku itu agar implementer tidak memilih kebijakan produk, keamanan, PII, atau penghapusan data sendiri.

## Apa yang berubah?

Planning sekarang mencatat kontrak yang disetujui: Audit Trail hanya menampilkan mutasi data CMS; auth tidak ikut dibaca; list/detail memakai `audit.read`; export CSV juga memerlukan `audit.export`; aktor disimpan sebagai snapshot ID, display name, dan email; perubahan memakai nilai before/after yang di-allowlist; tampilan waktu memakai WIB; audit write CMS bersifat best-effort dengan Pino terstruktur; dan kedua tabel dipurge permanen setelah satu tahun melalui proses harian yang terbatas.

Catalog fase 1 mencakup create/update/delete untuk category, role, user, profile update, serta `audit.exported`. Query menyediakan filter, pencarian aktor/target, pilihan pagination 20/50/100, dan export maksimum 10.000 baris untuk rentang 31 hari.

## Apa yang tidak berubah?

Tidak ada source code, konfigurasi, schema, migration, test, atau manifest produksi yang diubah oleh pekerjaan BA ini. `be/14-audit-trail` tetap COMPLETE. `audit_events` tetap fondasi generik dan `auth_audit_events` tetap terpisah. Endpoint, permission, schema snapshot, scheduler, export, dan UI yang disetujui belum menjadi perilaku runtime sampai child implementation selesai.

## Dependency task apa?

Kontrak bergantung pada fondasi `be/14`, auth/RBAC, module architecture, OpenAPI, BullMQ, serta CMS yang sudah ada. Setelah BA selesai, Backend read API, event coverage, dan retention dapat berjalan sesuai dependency card; Frontend menunggu read API; Reviewer dan QA mengikuti seluruh implementation child.

## Risiko utama?

Best-effort berarti mutasi CMS atau export dapat berhasil tanpa audit row. Saputra menerima risiko fase 1 ini; Pino mendeteksi kegagalan tetapi tidak dapat merekonstruksi history yang hilang. Produk tidak boleh mengklaim history lengkap atau non-repudiable.

Snapshot aktor dan perubahan managed-user menyimpan PII berupa email hingga satu tahun. Purge bersifat permanen, tanpa archive atau legal hold. Risiko lain adalah kebocoran secret melalui metadata/CSV, pembacaan tanpa permission backend, cursor yang salah saat timestamp sama, serta perubahan tidak sengaja pada perilaku audit auth yang harus tetap dipertahankan.

## Bagaimana cara mengecek hasilnya?

Tinjau `references/approved-requirements.md` terhadap komentar approval Saputra, lalu cocokkan `technical.md` dengan decision ID. Pastikan catalog hanya berisi event CMS yang disetujui, auth tetap tersembunyi, write policy CMS adalah best-effort, dan retention kedua tabel tepat satu tahun. Untuk planning diff, jalankan `git diff --check`, cek `git status --short`, dan pastikan perubahan hanya berada di `tasks/be/41-audit-trail/`.

## Apa yang harus direview manusia?

Reviewer harus memastikan tidak ada keputusan yang melebar dari approval: permission terpisah, actor PII, before/after allowlist, batas query/export, accepted missing-history risk, cutoff purge strict older-than, jadwal 02:00 Asia/Jakarta, batch 1.000, run bound 30 detik, serta tidak adanya tenant, impersonation, archive, legal hold, durable retry, atau auth viewer.

## Apa yang belum dikerjakan?

Seluruh implementasi produksi masih belum dikerjakan: permission seed, migration snapshot aktor, API list/detail/export, perubahan emitter CMS menjadi best-effort, scheduler retention, OpenAPI, UI CMS, test implementation, browser verification, review, dan QA. Konsep di luar fase 1 tetap memerlukan persetujuan manusia baru.
