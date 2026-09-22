import { createApp } from 'vue';
import './styles.css';
import App from './App.vue';
import { loadEnv } from './env';

loadEnv();
createApp(App).mount('#app');
