# fe/06-auth-state — Authentication And Session State

Task ini sudah diimplementasikan dengan Pinia melalui `apps/cms/src/stores/auth.ts`. Lifecycle login, one-time restoration, single-flight refresh, rotasi refresh token, logout current, logout-all, dan cleanup failure sudah terpusat. Access token tetap memory-only; refresh token mengikuti backend JSON contract dan disimpan di `sessionStorage`, bukan Secure HttpOnly cookie.

Auth store tidak mengisi user, role, atau permission secara fiktif karena backend belum menyediakan endpoint profile/effective-permission. Test auth, full test suite, lint, typecheck, dan build lulus. Browser auth-flow verification menunggu UI auth dari task berikutnya.
