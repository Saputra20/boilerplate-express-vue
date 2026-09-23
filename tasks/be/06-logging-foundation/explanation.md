# be/06-logging-foundation — Logging Foundation

## Tujuan

Task ini menetapkan kontrak logging backend agar implementasi berikutnya tidak lagi terblokir oleh aturan rotasi file log yang belum jelas.

## Keputusan Yang Sudah Disetujui

- Morgan dipakai untuk access log HTTP.
- Pino dipakai untuk application log dan error log.
- Log yang relevan memakai request ID yang sudah menjadi standar repository.
- Password, hash password, token, header otorisasi, cookie kredensial, private key, secret, dan kredensial mentah harus disamarkan sebelum keluar ke log.
- File log aktif dirotasi saat mencapai `10 MB`.
- History file log disimpan selama `14 hari`; file yang lebih lama dibersihkan.

## Perilaku Saat Gagal

Kegagalan menulis atau merotasi file log tidak otomatis mematikan API bila logging terminal/stderr masih aman dan berfungsi. Kondisi ini harus terlihat sebagai degradasi observability dengan pesan yang sudah disanitasi, tanpa loop error logging.

Jika semua tujuan logging gagal saat startup sehingga tidak ada jalur logging operasional yang aman, startup harus berhenti secara deterministik dengan pesan yang tidak membocorkan secret.

## Batas Task

Task implementasi berikutnya hanya membuat fondasi logging. Audit record tetap terpisah. Session, JWT, refresh token, login, register, authorization middleware, external log aggregation, ELK, Loki, OpenTelemetry, Fluentd, dan Winston tidak termasuk.

## Cara Review

Reviewer perlu memastikan pemisahan Morgan/Pino tetap jelas, request correlation ada, redaction diuji, rotasi dan cleanup memakai direktori sementara saat test, kegagalan file memakai fallback aman, dan kegagalan total menghentikan startup. Test tidak boleh membuat fixture `10 MB`; ambang kecil yang diinjeksikan cukup untuk membuktikan perilaku sama.

## Status

Blocker rotasi sudah selesai. Task siap diimplementasikan, tetapi belum ada kode logging, dependency baru, atau perubahan aplikasi dari pembaruan kontrak ini.
