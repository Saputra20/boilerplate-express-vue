# fe/21-forgot-password — Lupa Password

## Apa yang dibuat?
Rencana implementasi halaman publik `/forgot-password` untuk meminta email reset password melalui endpoint backend yang sudah tersedia.

## Kenapa dibuat?
Login CMS saat ini belum menyediakan alur pemulihan password. Backend sudah memiliki kontrak recovery yang menyamakan respons agar keberadaan akun tidak terbuka.

## Apa yang berubah?
Task implementasi nantinya menambahkan route, form email, pemanggilan API, state konfirmasi/error, tautan dari login, dan tes. UI memakai presentasi TailAdmin yang sudah ada; bila diperlukan, task ini menyiapkan satu layout auth bersama tanpa mengubah perilaku login.

## Apa yang tidak berubah?
Backend, database, rate limit, template email, sesi, penyimpanan token, dan kebijakan password tidak berubah.

## Dependency task apa?
Task FE `06`, `07`, `11`, `13`; backend `be/35-password-recovery` dan gerbang validasi `be/37-auth-email-quality-gate`. Implementasi backend dan integrasi tercatat selesai/lulus.

## Risiko utama?
Copy atau error dapat membocorkan keberadaan akun. Jawaban `202` harus tetap menghasilkan konfirmasi generik; limit per alamat juga sengaja tidak tampak berbeda.

## Bagaimana cara mengecek hasilnya?
Tes Vue/API client membuktikan endpoint dan body tepat, state generik/429/error, dan auth store tidak berubah. Jalankan lint, typecheck, format, build, Anti-Slop, serta verifikasi browser desktop dan mobile.

## Apa yang harus direview manusia?
Kesetaraan tampilan dengan login TailAdmin dan kalimat konfirmasi yang tidak menjanjikan email terkirim atau membocorkan akun.

## Apa yang belum dikerjakan?
Implementasi frontend. Ketentuan deploy dengan path-prefix belum ditetapkan; jika `PUBLIC_APP_URL` memakai prefix, CMS harus memakai base path yang sama.
