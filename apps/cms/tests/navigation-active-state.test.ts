import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, describe, expect, it } from 'vitest';
import AppNavigation from '../src/components/AppNavigation.vue';
import { routes } from '../src/router';
import { useAuthStore } from '../src/stores/auth';

describe('navigation active route styling', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('highlights only the exact route instead of keeping Home active on child pages', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push('/roles');
    await router.isReady();

    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = useAuthStore(pinia);
    auth.status = 'authenticated';
    auth.identity = {
      userId: '00000000-0000-4000-8000-000000000001',
      email: 'fixture@example.com',
      roles: ['admin'],
      effectivePermissions: ['dashboard.read', 'role.read'],
    };

    const wrapper = mount(AppNavigation, { global: { plugins: [router, pinia] } });
    const home = wrapper.get('nav ul a[href="/"]');
    const roles = wrapper.get('nav ul a[href="/roles"]');

    expect(home.attributes('class')).not.toContain('bg-cms-primary-soft');
    expect(roles.attributes('class')).toContain('bg-cms-primary-soft');

    wrapper.unmount();
  });
});
