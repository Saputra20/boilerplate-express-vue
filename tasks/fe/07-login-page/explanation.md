# fe/07-login-page — Login Page

Task ini sudah diimplementasikan. `LoginView.vue` memakai field backend nyata `email` dan `password`, validasi Zod, Pinia auth state, loading/disabled/error states, focus/error association, dan return navigation yang hanya menerima path internal.

Login tidak menambahkan username, social login, remember-me, atau forgot-password. Error `401` memakai copy generik agar tidak membocorkan account existence. Test, lint, typecheck, dan build lulus; browser verification serta review visual manusia masih pending.
