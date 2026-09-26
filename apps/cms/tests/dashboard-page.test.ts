import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: { getDashboardSummary: vi.fn() } }));

vi.mock('../src/stores/auth', () => ({ cmsApiClient: api }));

import HomeView from '../src/views/HomeView.vue';

const summary = {
  users: { total: 8, active: 6, disabled: 2 },
  roles: { total: 3 },
  categories: { total: 5, active: 4 },
};

describe('dashboard summary page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading then displays only the returned metric values', async () => {
    let resolveSummary: ((value: typeof summary) => void) | undefined;
    api.getDashboardSummary.mockReturnValue(
      new Promise((resolve) => {
        resolveSummary = resolve;
      }),
    );
    const wrapper = mount(HomeView, { global: { stubs: { RouterLink: true } } });

    expect(wrapper.get('[role="status"]').text()).toContain('Loading');
    resolveSummary?.(summary);
    await flushPromises();

    expect(wrapper.text()).toContain('Users');
    expect(wrapper.text()).toContain('Roles');
    expect(wrapper.text()).toContain('Categories');
    expect(wrapper.text()).toContain('Workspace records');
    expect(wrapper.text()).toContain('Account status');
    expect(wrapper.text()).toContain('8');
    expect(wrapper.text()).toContain('6');
    expect(wrapper.text()).toContain('2');
    expect(wrapper.text()).toContain('3');
    expect(wrapper.text()).toContain('5');
    expect(wrapper.text()).toContain('4');
    expect(api.getDashboardSummary).toHaveBeenCalledOnce();
  });

  it('renders zero values as valid metrics', async () => {
    api.getDashboardSummary.mockResolvedValue({
      users: { total: 0, active: 0, disabled: 0 },
      roles: { total: 0 },
      categories: { total: 0, active: 0 },
    });
    const wrapper = mount(HomeView, { global: { stubs: { RouterLink: true } } });
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('No workspace records yet');
    expect(wrapper.text().match(/0/g)).toHaveLength(4);
  });

  it('shows a recoverable error and retries the request', async () => {
    api.getDashboardSummary.mockRejectedValueOnce(new Error('offline'));
    api.getDashboardSummary.mockResolvedValueOnce(summary);
    const wrapper = mount(HomeView, { global: { stubs: { RouterLink: true } } });
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain('Unable to load the dashboard summary.');
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(api.getDashboardSummary).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Categories');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });
});
