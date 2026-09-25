import { createRouter, createWebHistory } from 'vue-router';
import type { Router } from 'vue-router';
import AppShell from '../components/AppShell.vue';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import NotFoundView from '../views/NotFoundView.vue';
import DeniedView from '../views/DeniedView.vue';
import { sanitizeReturnTo } from './return-to';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiredPermission?: string;
    public?: boolean;
    title?: string;
    description?: string;
  }
}

type AuthRouterState = {
  restore: () => Promise<boolean>;
  isAuthenticated: () => boolean;
  can: (permission: string) => boolean;
};

export const routes = [
  {
    path: '/',
    component: AppShell,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'home',
        component: HomeView,
        meta: {
          title: 'Overview',
          description: 'Keep your workspace focused on the next approved module.',
        },
      },
      { path: 'forbidden', name: 'denied', component: DeniedView },
    ],
  },
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

export function installAuthGuard(targetRouter: Router, auth: AuthRouterState): void {
  targetRouter.beforeEach(async (to) => {
    await auth.restore();

    if (to.name === 'login') {
      return auth.isAuthenticated() ? { path: '/' } : true;
    }

    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth === true);
    if (!requiresAuth || auth.isAuthenticated()) {
      const requiredPermission = to.matched
        .map((record) => record.meta.requiredPermission)
        .find((permission): permission is string => permission !== undefined);
      if (requiredPermission !== undefined && !auth.can(requiredPermission)) {
        return { name: 'denied' };
      }
      return true;
    }

    return {
      name: 'login',
      query: { returnTo: sanitizeReturnTo(to.fullPath) },
    };
  });
}
