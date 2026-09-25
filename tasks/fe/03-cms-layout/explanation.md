# fe/03-cms-layout — CMS Application Shell

Task ini sekarang menjadi shell CMS netral untuk fondasi auth/RBAC: route `/login`, `/`, catch-all Not Found, sidebar, header, main, dan mobile drawer. Implementasi shell sudah ada; browser verification masih pending sehingga execution belum selesai. Tidak ada future business route atau permission resolution. Dependency hanya `fe/02`; backend authorization tetap dimiliki API.
