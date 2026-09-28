# be/32-email-template-foundation — Template Email Transaksional

## Apa yang dibuat?

Renderer email transaksional bersama untuk verifikasi email, reset password, dan konfirmasi password berubah. Setiap template menghasilkan subject, preheader, HTML, serta plain text. Branding memakai identitas CMS yang sudah ada: nama CMS, label Content workspace, tanda huruf C, warna utama, warna netral, dan arah tipografi Outfit dengan fallback email-safe. Kontrak juga mencakup preview lokal dan bukti visual.

```text
                 EMAIL TRANSAKSIONAL

┌──────────────────────────────────────────┐
│ Identitas produk              Jenis email│
│                                          │
│                  Ikon                    │
│                                          │
│                 Judul                    │
│           Pesan pendukung                │
│           [ Aksi utama ]                 │
│             Masa berlaku                 │
│  ┌────────────────────────────────────┐  │
│  │ URL cadangan yang bisa disalin     │  │
│  └────────────────────────────────────┘  │
│             Pemberitahuan keamanan      │
├──────────────────────────────────────────┤
│ Produk                      Tautan resmi │
└──────────────────────────────────────────┘
```

Empat pertimbangan presentasi yang wajib direview:

- Desktop: kontainer email terpusat dengan lebar terkendali.
- Mobile: satu kolom, tautan panjang tetap bisa dibaca, tanpa overflow.
- Dark-mode-aware: warna adaptif jika didukung, tetapi tetap terbaca saat klien mengubah warna sendiri.
- Plain text: konten dan tautan tetap jelas tanpa HTML atau gambar.

## Kenapa dibuat?

Supaya email keamanan konsisten dengan produk, mudah dibaca pada klien email, dan tidak membuat Auth menyimpan markup. Referensi visual memberi arah komposisi; identitas CMS di repository menjadi sumber branding setelah disetujui.

## Apa yang berubah?

Implementasi membuat satu layout bersama, tiga renderer bertipe, pengujian output/escaping, dan preview lokal dengan data sintetis. Branding memakai identitas CMS yang sudah disetujui. Password-changed hanya memperoleh renderer; kontrak ini tidak menyetujui kapan email tersebut dikirim.

## Apa yang tidak berubah?

SMTP dari `be/31`, queue dan pengiriman token dari `be/33`, API dan siklus challenge Auth, expiry, database, frontend, serta perilaku perubahan password tidak diubah oleh task ini. Tidak ada preview endpoint publik atau pengiriman email sungguhan dari test.

## Dependency task apa?

Renderer menggunakan kontrak transport `be/31` dan batas modul dari `be/21`. `be/33`, `be/34`, dan `be/35` memiliki kontrak lanjutan untuk pengiriman aman, verifikasi, serta recovery. Task implementasi harus menunggu keputusan yang tercatat di bagian Open Points technical contract.

## Risiko utama?

Link keamanan dapat bocor melalui log/snapshot atau konten dapat menampilkan branding, URL, masa berlaku, perangkat, atau lokasi yang belum disetujui. HTML email juga berbeda dukungannya antar klien. Kontrak mewajibkan nilai sintetis untuk preview/test dan bukti hanya untuk klien yang benar-benar diperiksa.

## Bagaimana cara mengecek hasilnya?

Test renderer, validasi URL, escaping, expiry dari caller, data opsional, dan preview guard sudah dijalankan. Preview HTML/plain-text memakai data sintetis deterministik dan tersedia di `tasks/be/32-email-template-foundation/artifacts/` dengan nama `verify-email`, `reset-password`, dan `password-changed`. Pemeriksaan visual desktop/mobile/dark-mode dan kompatibilitas klien belum dilakukan; visual gate masih terbuka. Test dan preview tidak mengirim email eksternal.

## Apa yang harus direview manusia?

Konsistensi dengan CMS source, tautan bantuan/privacy/terms yang benar atau keputusan untuk menghilangkannya, serta kontrak expiry dari task pemilik. Review juga bukti tampilan lokal dan batas kompatibilitas klien. `docs/DESIGN.md` masih menyatakan brand belum ditetapkan; perbedaan ini dicatat dan task ini memakai identitas CMS sesuai persetujuan eksplisit.

## Apa yang belum dikerjakan?

Renderer dan preview sudah dibuat. Implementasi lulus pemeriksaan kode yang tercatat; task ditandai `IMPLEMENTED — VISUAL / CLIENT REVIEW PENDING` sampai review visual manual diselesaikan. Reviewer perlu memeriksa desktop/light, responsif mobile, dark-mode-aware jika didukung, fallback URL panjang, hierarki CTA, footer, tipografi, spacing, konten panjang, dan plain-text fallback. Tautan resmi dan masa berlaku verifikasi/reset tetap dimiliki task terkait dan tidak ditebak. Integrasi pengiriman worker menunggu keputusan handoff aman dari be/33. Tidak ada aset logo/email terpisah di repository; template memakai tanda huruf C yang sudah ada dan teks agar tetap jelas saat gambar diblokir.

### Addendum — URL lokal untuk pengembangan

Tautan aksi email tetap harus memakai HTTPS. Renderer menerima opsi dari konfigurasi tervalidasi untuk mengizinkan HTTP hanya pada `localhost`, `127.0.0.1`, dan `::1` di development/test. Production tetap menolak HTTP. Kode renderer tidak membaca `NODE_ENV` atau `process.env` sendiri.
