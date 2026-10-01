# fe/23-verify-email — Verifikasi Email

## Apa yang dibuat?
Rencana halaman publik yang menerima tautan verifikasi email, mengirim token ke API, lalu menampilkan hasilnya. Permintaan kirim ulang dapat memakai endpoint email-request yang memang sudah ada.

## Kenapa dibuat?
Backend sudah mengirim tautan `PUBLIC_APP_URL/verify-email?token=…`, tetapi CMS belum memiliki route penerimanya.

## Apa yang berubah?
Task implementasi nantinya menambah route/view, pemanggilan API, state verifikasi, opsi resend berbasis email bila dipilih, serta tes.

## Apa yang tidak berubah?
Backend, TTL 24 jam, aturan konsumsi satu kali, login, dan sesi tidak berubah. Verifikasi tidak otomatis membuat sesi login.

## Dependency task apa?
FE-21 menyediakan auth layout; `be/34-email-verification` menyediakan kontrak, dan `be/37-auth-email-quality-gate` mencatat validasi integrasi lulus.

## Risiko utama?
Token ada di query email dan harus segera dihapus dari address bar serta tidak disimpan. API membedakan expired dari invalid/used, tetapi tidak memberi status khusus “sudah terverifikasi”.

## Bagaimana cara mengecek hasilnya?
Tes membuktikan route/query, request tepat satu kali, pemetaan status, token cleanup, dan auth store tetap sama. Jalankan lint, typecheck, format, build, Anti-Slop, serta verifikasi browser desktop/mobile.

## Apa yang harus direview manusia?
Copy hasil verifikasi dan apakah inline resend dengan input email membantu tanpa mengaburkan makna respons generik.

## Apa yang belum dikerjakan?
Implementasi frontend. Dukungan deployment dengan base path selain `/` perlu disejajarkan dengan `PUBLIC_APP_URL` sebelum rilis jika dibutuhkan.
