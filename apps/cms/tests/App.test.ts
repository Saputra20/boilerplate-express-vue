import { createMemoryHistory, createRouter } from 'vue-router';
import { createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import App from '../src/App.vue';
import { routes } from '../src/router';

async function mountApp(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  router.push(path);
  await router.isReady();

  const wrapper = mount(App, {
    attachTo: document.body,
    global: { plugins: [router, createPinia()] },
  });
  return { router, wrapper };
}

describe('CMS shell', () => {
  it('renders the neutral home shell and configured navigation', async () => {
    const { wrapper } = await mountApp('/');

    expect(wrapper.get('nav').text()).toContain('Home');
    expect(wrapper.get('header').text()).toContain('CMS');
    expect(wrapper.get('main h1').text()).toBe('Overview');
    expect(wrapper.get('nav a').attributes('href')).toBe('/');
  });

  it('renders public login and not-found routes', async () => {
    const login = await mountApp('/login');
    expect(login.wrapper.get('h1').text()).toBe('Sign in to CMS');

    const notFound = await mountApp('/missing');
    expect(notFound.wrapper.get('h1').text()).toBe('Page not found');
    expect(notFound.wrapper.get('a').attributes('href')).toBe('/');

    const denied = await mountApp('/forbidden');
    expect(denied.wrapper.get('h1').text()).toBe('Access denied');
    expect(denied.wrapper.get('a').attributes('href')).toBe('/');
  });

  it('opens and closes the mobile navigation with keyboard and selection', async () => {
    const { wrapper } = await mountApp('/');
    const trigger = wrapper.get('button[aria-controls="mobile-navigation"]');

    await trigger.trigger('click');
    await nextTick();
    await nextTick();
    expect(wrapper.get('[role="dialog"]')).toBeTruthy();
    expect(wrapper.get('main').attributes('inert')).toBeDefined();
    expect(document.activeElement?.getAttribute('data-mobile-nav-link')).toBe('true');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);

    await trigger.trigger('click');
    await wrapper.get('[role="dialog"] a').trigger('click');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });
});
