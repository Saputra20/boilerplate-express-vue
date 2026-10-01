# FE-24 — Ganti Password Saat Login Pertama

## Apa yang dibuat?

Halaman `/change-password` untuk pengguna terautentikasi yang wajib mengganti password, beserta penguncian navigasi hingga `/api/v1/me` memastikan kewajiban tersebut sudah selesai.

## Kenapa dibuat?

BE-38 menetapkan status dari database, endpoint ganti password khusus, dan enforcement server. FE-24 perlu mengonsumsi kontrak itu agar kondisi wajib tetap diketahui setelah login, refresh, dan pemuatan ulang.

## Apa yang berubah?

Schema login mempertahankan flag opsional; context `/me` menjadi sumber status pada auth store. Router mengarahkan pengguna yang diwajibkan ke halaman baru. Form mengirim password saat ini dan password baru ke endpoint authenticated, memeriksa konfirmasi di browser, lalu meminta `/me` lagi sebelum membuka CMS.

## Apa yang tidak berubah?

Endpoint backend, sesi, audit, enforcement API, flow reset password publik, dan fitur CMS lain tidak berubah. Router hanya membatasi navigasi; server tetap penegak akses API.

## Dependency task apa?

FE-06/07/08/11/13 dan BE-10/25/35/38. BE-38 telah diimplementasikan dan divalidasi untuk menjadi kontrak FE-24.

## Risiko utama?

Jika frontend meninggalkan halaman berdasarkan state lokal sebelum membaca `/me`, pengguna dapat melihat halaman CMS saat backend masih mewajibkan perubahan. Implementasi menunggu konfirmasi identitas backend sebelum navigasi.

## Bagaimana cara mengecek hasilnya?

Jalankan lint, typecheck, 179 tes CMS, format check, dan build. Tes terfokus mencakup client, auth store, route guard, dan form. Pemeriksaan browser menunjukkan URL `/change-password` untuk sesi tanpa autentikasi diarahkan ke login; tampilan authenticated belum dapat diverifikasi.

## Apa yang harus direview manusia?

Periksa alur gate `/me` setelah login/restore dan keberhasilan perubahan, pemetaan error, fokus/label form, serta batas tanggung jawab router dan backend.

## Apa yang belum dikerjakan?

Inspeksi visual browser pada tampilan authenticated di desktop/mobile. Browser mencapai halaman login saat tidak ada sesi. Pengiriman password perubahan melalui browser memerlukan handoff manusia; karena itu visual verification dicatat `NOT RUN` dan task masih berstatus in progress.
