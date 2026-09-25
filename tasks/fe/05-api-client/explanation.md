# fe/05-api-client — API Client

Task ini sudah diimplementasikan dan diverifikasi. Client typed Axios berada di `apps/cms/src/api/client.ts`, kontrak Zod berada di `apps/cms/src/api/types.ts`, dan test fokus berada di `apps/cms/tests/api-client.test.ts`.

Client memakai `VITE_API_BASE_URL`, timeout 10 detik, endpoint auth v1 yang sesuai OpenAPI, bearer support eksplisit, validasi response token, normalisasi error aman untuk HTTP/timeout/network, dan tanpa generic retry. 401 dikembalikan ke auth state; 403 tetap authorization failure. Tidak ada endpoint profile/permission atau penyimpanan token yang dibuat. Test, lint, typecheck, dan build lulus.
