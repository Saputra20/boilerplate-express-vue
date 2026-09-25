import { createApp } from 'vue';
import './styles.css';
import App from './App.vue';
import { loadEnv } from './env';
import { installAuthGuard, router } from './router';
import { createPinia } from 'pinia';
import { useAuthStore } from './stores/auth';

loadEnv();
const pinia = createPinia();
installAuthGuard(router, useAuthStore(pinia));
createApp(App).use(pinia).use(router).mount('#app');
