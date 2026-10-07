import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CmsIcon from '../src/components/CmsIcon.vue';

const { api } = vi.hoisted(() => ({
  api: {
    listCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  },
}));

vi.mock('../src/stores/auth', () => ({
  cmsApiClient: api,
  useAuthStore: () => ({ can: () => true }),
}));

import CategoryView from '../src/views/CategoryView.vue';

const category = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'News',
  slug: 'news',
  description: null,
  isActive: true,
  createdAt: new Date('2026-09-26T00:00:00.000Z'),
  updatedAt: new Date('2026-09-26T00:00:00.000Z'),
  deletedAt: null,
};

describe('category management page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listCategories.mockResolvedValue({
      items: [category],
      pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
    });
  });

  it('uses page-level pagination contract for initial load, footer, and page-size changes', async () => {
    const wrapper = mount(CategoryView, { global: { components: { CmsIcon } } });
    await flushPromises();

    expect(api.listCategories).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10 }),
    );
    const rows = wrapper.get('select[aria-label="Rows per page"]');
    expect(rows.findAll('option').map((option) => option.text())).toEqual([
      '10',
      '20',
      '50',
      '100',
    ]);
    const footer = wrapper.get('footer');
    expect(footer.text()).toContain('Showing 1 to 10 of 25 categories');
    expect(footer.element.children[0]?.tagName).toBe('P');
    expect(footer.element.children[1]?.querySelector('label')?.textContent).toContain(
      'Rows per page',
    );
    expect(footer.element.children[1]?.querySelector('nav')).not.toBeNull();

    await wrapper.get('button[aria-label="Go to page 3"]').trigger('click');
    await flushPromises();
    await rows.setValue('20');
    await flushPromises();
    expect(api.listCategories).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
    );
    wrapper.unmount();
  });
});
