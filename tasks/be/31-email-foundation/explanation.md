# be/31-email-foundation — Fondasi Email SMTP

## Apa yang dibuat?

Kontrak SMTP terpusat agar modul bisnis dapat mengirim email tanpa mengetahui detail provider atau kredensial.

## Kenapa dibuat?

Email verifikasi dan reset password membutuhkan satu boundary aman yang dapat diuji dan ditutup dengan benar saat API berhenti.

## Apa yang berubah?

Implementasi nanti menambah konfigurasi, adapter transport, lifecycle, dan test SMTP palsu di `config/email`.

## Apa yang tidak berubah?

Tidak ada endpoint, tabel, migration, flow Auth, atau file environment yang diubah oleh task ini.

## Dependency task apa?

Logging dan startup lifecycle yang sudah ada; task ini memblokir template dan worker email.

## Risiko utama?

Kredensial/provider error bocor ke log atau modul Auth bergantung langsung pada SMTP.

## Bagaimana cara mengecek hasilnya?

Gunakan fake SMTP untuk test sukses, error, redaksi, dan shutdown; jalankan lint, typecheck, test, serta secret scan.

## Apa yang harus direview manusia?

Implementasi perlu membuktikan pilihan library memenuhi kriteria task. Kredensial SMTP dan alamat/nama pengirim diberikan melalui konfigurasi deployment.

## Apa yang belum dikerjakan?

Fondasi transport sudah dikerjakan dalam task ini. Flow verifikasi/reset, template, serta worker antrean ada di task lanjutan.
