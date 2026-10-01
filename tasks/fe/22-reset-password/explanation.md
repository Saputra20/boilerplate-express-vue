# fe/22-reset-password — Reset Password

## Apa yang dibuat?
Rencana halaman publik reset password yang membaca token dari query email, meminta password baru, dan mengirim konfirmasi ke backend.

## Kenapa dibuat?
Backend sudah membuat tautan `PUBLIC_APP_URL/reset-password?token=…` dan menyediakan konsumsi token satu kali. CMS belum mempunyai halaman penerima tautan itu.

## Apa yang berubah?
Task implementasi nantinya menambah route, halaman, metode API, validasi yang mencocokkan aturan backend, penanganan token sementara, state, serta tes. Password yang berhasil direset mengarah kembali ke login karena backend mencabut sesi aktif.

## Apa yang tidak berubah?
Backend, sesi, database, format token, dan aturan password tidak berubah. Tidak ada preflight API atau penyimpanan token.

## Dependency task apa?
FE-21 menyiapkan auth layout bersama; `be/35-password-recovery` dan `be/37-auth-email-quality-gate` menyediakan kontrak dan bukti integrasi yang lulus.

## Risiko utama?
Token ada di URL email dan hanya satu jam berlaku. UI harus menghapusnya dari address bar setelah dibaca, tidak menyimpannya, dan tidak membedakan token kedaluwarsa dari token yang sudah dipakai karena API menggabungkannya.

## Bagaimana cara mengecek hasilnya?
Tes membuktikan format route/query, body API, kebijakan 12–128 code point tanpa trim, state error/sukses, dan tidak ada persistensi token/password. Jalankan lint, typecheck, format, build, Anti-Slop, dan verifikasi browser.

## Apa yang harus direview manusia?
Kesesuaian tautan email dan route ketika deployment menggunakan base path, serta copy penanganan tautan yang tidak berlaku.

## Apa yang belum dikerjakan?
Implementasi frontend. Deployment CMS dengan path-prefix belum dikontrak; root deployment yang berjalan saat ini kompatibel.
