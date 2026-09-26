# be/36-email-queue-observability — Penjelasan

## 1. Apa yang dibuat?

Task ini merencanakan visibilitas aman untuk job email transaksional pada Queue Monitor dan log aplikasi.

## 2. Kenapa dibuat?

Operator perlu mengetahui status dan kegagalan pengiriman, tetapi Bull Board dapat menampilkan payload job dan alasan gagal secara langsung.

## 3. Apa yang berubah?

Job email akan memakai metadata aman dan kegagalan provider akan diubah menjadi kategori terbatas yang aman untuk dilihat.

## 4. Apa yang tidak berubah?

Basic Auth pada `/ops/queues`, sifat read-only Queue Monitor, retry antrean, RBAC, dan UI CMS tidak diubah.

## 5. Dependency task apa?

Membutuhkan fondasi antrean, Queue Monitor, audit, dan worker email pada task 33.

## 6. Risiko utama?

Payload job atau alasan gagal dapat membocorkan token, alamat email, isi pesan, credential, atau stack trace. Karena itu data harus aman sejak dibuat.

## 7. Bagaimana cara mengecek hasilnya?

Uji job sukses dan gagal dengan provider palsu, lalu periksa payload, Queue Monitor, dan log. Semua data sensitif harus tidak ada.

## 8. Apa yang harus direview manusia?

Manusia perlu meninjau kategori kegagalan yang aman dan memutuskan terpisah bila akses operasional perlu berpindah dari Basic Auth ke RBAC.

## 9. Apa yang belum dikerjakan?

Task ini belum mengubah kode atau mengubah mekanisme akses Queue Monitor.
