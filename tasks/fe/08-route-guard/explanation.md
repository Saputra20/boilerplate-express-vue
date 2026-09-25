# fe/08-route-guard — Authentication Route Guard

Task ini sudah diimplementasikan untuk authentication routing. Guard menunggu restoration Pinia, melindungi `/` dan descendant CMS, mengarahkan unauthenticated user ke `/login` dengan `returnTo` yang aman, serta mengarahkan authenticated user dari `/login` ke `/`.

Sanitizer menolak external/protocol-relative/malformed return target. Permission metadata tidak diproses oleh guard karena keputusan authorization tetap milik API dan task `fe/09`. Test, lint, typecheck, dan build lulus; browser critical-flow verification dan review manusia masih pending.
