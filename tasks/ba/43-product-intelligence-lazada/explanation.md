# Penjelasan Rencana Product Intelligence Lazada

1. Apa yang dibuat?
Paket planning successor untuk kesiapan produksi Product Intelligence berbasis Lazada Indonesia. Isinya kontrak legal, data publik, retention, harness reliability multi-hari, penanganan zero-card, arsitektur, dependency, task breakdown, acceptance criteria, dan approval gate.

2. Kenapa dibuat?
POC membuktikan 3 keyword publik dapat merender 40 card per keyword pada kondisi tertentu, tetapi belum membuktikan izin legal, kestabilan lintas hari, quota, retention, atau kesiapan produksi. Planning ini menutup gap tanpa mengubah production source.

3. Apa yang berubah?
Empat dokumen planning baru di `tasks/ba/43-product-intelligence-lazada/`. Kontrak membatasi MVP pada Lazada Indonesia, maksimal 3 keyword, first page, sekitar 120 observasi per hari, raw/provenance, nullable fields, dan no invented metrics.

4. Apa yang tidak berubah?
Tidak ada perubahan API, CMS, schema, migration, scheduler, queue, collector, trend engine, AI, Design Inspiration, deployment, atau POC artifact. Shopee dan TikTok tetap di luar scope.

5. Dependency task apa?
Bergantung pada `tasks/ba/42-product-intelligence/` dan bukti `data/scraping-poc/`. Semua implementation task tetap blocked/todo sampai legal, data, reliability harness, dan production approval selesai.

6. Risiko utama?
Terms/retention tidak mengizinkan collection; transient zero-card shell; selector drift; route redirect; missing fields; rate limit; perubahan ID/ordering; salah membaca raw sold, review, price, atau rank sebagai trend.

7. Bagaimana cara mengecek hasilnya?
Review `technical.md`, `references/operational-contract.md`, dan `references/task-breakdown.md`; cocokkan dengan POC; jalankan `git diff --check`; pastikan diff hanya berisi planning files baru.

8. Apa yang harus direview manusia?
Legal/terms, data privacy, field permission, frequency/request estimate, auth, retention, valid-empty threshold, retry/timeout, diagnostic TTL, TrendMetrics definition, API/RBAC, dan production gate.

9. Apa yang belum dikerjakan?
Multi-day harness execution, production scheduler, queue, collector, schema, API, CMS, trend calculation, AI, Design Inspiration, dan semua implementation task.

Status wajib: HUMAN LEGAL REVIEW REQUIRED.
