import { createRouter, createWebHistory } from 'vue-router';
import type { RouteLocationNormalized, Router } from 'vue-router';
import AppShell from '../components/AppShell.vue';
import HomeView from '../views/HomeView.vue';
import ForgotPasswordView from '../views/ForgotPasswordView.vue';
import ResetPasswordView from '../views/ResetPasswordView.vue';
import VerifyEmailView from '../views/VerifyEmailView.vue';
import ChangePasswordView from '../views/ChangePasswordView.vue';
import SelfServiceChangePasswordView from '../views/SelfServiceChangePasswordView.vue';
import LoginView from '../views/LoginView.vue';
import NotFoundView from '../views/NotFoundView.vue';
import DeniedView from '../views/DeniedView.vue';
import CategoryView from '../views/CategoryView.vue';
import RoleView from '../views/RoleView.vue';
import RoleFormView from '../views/RoleFormView.vue';
import UserView from '../views/UserView.vue';
import UserFormView from '../views/UserFormView.vue';
import ProfileView from '../views/ProfileView.vue';
import AuditTrailView from '../views/AuditTrailView.vue';
import AuditEventDetailView from '../views/AuditEventDetailView.vue';
import { sanitizeReturnTo } from './return-to';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiredPermission?: string;
    public?: boolean;
    skipAuthRestore?: boolean;
    title?: string;
  }
}

type AuthRouterState = {
  restore: () => Promise<boolean>;
  isAuthenticated: () => boolean;
  can: (permission: string) => boolean;
  isPasswordChangeRequired: () => boolean;
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
          requiredPermission: 'dashboard.read',
        },
      },
      {
        path: 'profile',
        name: 'profile',
        component: ProfileView,
        meta: { title: 'Profile' },
      },
      { path: 'forbidden', name: 'denied', component: DeniedView },
      {
        path: 'categories',
        name: 'categories',
        component: CategoryView,
        meta: {
          title: 'Categories',
          requiredPermission: 'category.read',
        },
      },
      {
        path: 'settings/change-password',
        name: 'self-service-change-password',
        component: SelfServiceChangePasswordView,
        meta: { title: 'Change password' },
      },
      {
        path: 'roles/create',
        name: 'role-create',
        component: RoleFormView,
        props: { mode: 'create' },
        meta: {
          title: 'Create role',
          requiredPermission: 'role.create',
        },
      },
      {
        path: 'roles/:id/edit',
        name: 'role-edit',
        component: RoleFormView,
        props: (route: RouteLocationNormalized) => ({
          mode: 'edit' as const,
          roleId: String(route.params.id),
        }),
        meta: {
          title: 'Edit role',
          requiredPermission: 'role.update',
        },
      },
      {
        path: 'roles',
        name: 'roles',
        component: RoleView,
        meta: {
          title: 'Roles',
          requiredPermission: 'role.read',
        },
      },
      {
        path: 'users/create',
        name: 'user-create',
        component: UserFormView,
        props: { mode: 'create' },
        meta: {
          title: 'Create user',
          requiredPermission: 'user.create',
        },
      },
      {
        path: 'users/:id/edit',
        name: 'user-edit',
        component: UserFormView,
        props: (route: RouteLocationNormalized) => ({
          mode: 'edit' as const,
          userId: String(route.params.id),
        }),
        meta: {
          title: 'Edit user',
          requiredPermission: 'user.update',
        },
      },
      {
        path: 'users',
        name: 'users',
        component: UserView,
        meta: {
          title: 'Users',
          requiredPermission: 'user.read',
        },
      },
      {
        path: 'audit-trail',
        name: 'audit-trail',
        component: AuditTrailView,
        meta: {
          title: 'Audit Trail',
          requiredPermission: 'audit.read',
        },
      },
      {
        path: 'audit-trail/:id',
        name: 'audit-event',
        component: AuditEventDetailView,
        meta: {
          title: 'Audit Event',
          requiredPermission: 'audit.read',
        },
      },
    ],
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: ForgotPasswordView,
    meta: { public: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: ResetPasswordView,
    meta: { public: true },
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: VerifyEmailView,
    meta: { public: true, skipAuthRestore: true },
  },
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  {
    path: '/change-password',
    name: 'change-password',
    component: ChangePasswordView,
    meta: { requiresAuth: true },
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

export function installAuthGuard(targetRouter: Router, auth: AuthRouterState): void {
  targetRouter.beforeEach(async (to) => {
    if (to.meta.skipAuthRestore !== true) await auth.restore();

    if (to.name === 'login') {
      return auth.isAuthenticated()
        ? { path: auth.isPasswordChangeRequired() ? '/change-password' : '/' }
        : true;
    }

    if (auth.isAuthenticated() && auth.isPasswordChangeRequired()) {
      return to.name === 'change-password'
        ? true
        : {
            name: 'change-password',
            query: { returnTo: sanitizeReturnTo(to.fullPath) },
          };
    }

    if (to.name === 'change-password' && auth.isAuthenticated()) return { path: '/' };

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
