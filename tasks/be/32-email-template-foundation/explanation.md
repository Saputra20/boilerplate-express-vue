# be/32-email-template-foundation — Template Email Transaksional

## Apa yang dibuat?

Renderer email bersama untuk verifikasi dan reset password, lengkap dengan subject, preview, HTML, dan plain text.

## Kenapa dibuat?

Supaya Auth tidak menyimpan HTML panjang dan setiap email keamanan memiliki CTA, fallback URL, serta pesan expiry yang konsisten.

## Apa yang berubah?

Task implementasi nanti menambah module notification khusus template, bukan SMTP atau endpoint publik.

## Apa yang tidak berubah?

Tidak ada queue, API, schema, migration, atau email marketing.

## Dependency task apa?

Memerlukan kontrak transport SMTP dari `be/31`; dipakai oleh worker, verifikasi, dan password recovery.

## Risiko utama?

HTML tidak aman, link salah, atau identitas brand/support dibuat tanpa sumber.

## Bagaimana cara mengecek hasilnya?

Test render/escaping/snapshot serta preview lokal bila sudah disetujui.

## Apa yang harus direview manusia?

Nama produk, logo, support contact, isi expiry, dan kebutuhan email konfirmasi perubahan password.

## Apa yang belum dikerjakan?

Template dan preview belum diimplementasikan.
