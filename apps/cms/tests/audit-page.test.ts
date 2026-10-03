import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/api/client';
import { installAuthGuard, routes } from '../src/router';

const { api, auth } = vi.hoisted(() => ({
  api: {
    listAuditEvents: vi.fn(),
    getAuditEvent: vi.fn(),
    exportAuditEvents: vi.fn(),
  },
  auth: { can: vi.fn((permission: string) => permission === 'audit.read') },
}));

vi.mock('../src/stores/auth', () => ({
  cmsApiClient: api,
  useAuthStore: () => auth,
}));

const eventId = '00000000-0000-4000-8000-000000000010';
const actorId = '00000000-0000-4000-8000-000000000011';
const resourceId = '00000000-0000-4000-8000-000000000012';
const event = {
  id: eventId,
  eventType: 'category.updated' as const,
  label: 'Category updated',
  actor: {
    type: 'user' as const,
    available: true,
    id: actorId,
    displayName: 'Ada Lovelace',
    email: 'ada@example.com',
  },
  resource: { type: 'category', id: resourceId },
  outcome: 'success' as const,
  createdAt: new Date('2026-01-31T12:00:00.000Z'),
};
const detail = {
  ...event,
  requestId: '00000000-0000-4000-8000-000000000013',
  changes: {
    available: true,
    before: { name: 'Old name' },
    after: { name: 'New name' },
  },
};
const wrappers: VueWrapper[] = [];

function createTestRouter() {
  const router = createRouter({ history: createMemoryHistory(), routes });
  installAuthGuard(router, {
    restore: async () => true,
    isAuthenticated: () => true,
    can: (permission) => auth.can(permission),
    isPasswordChangeRequired: () => false,
  });
  return router;
}

async function mountAuditPage(path: string) {
  const router = createTestRouter();
  await router.push(path);
  await router.isReady();
  const wrapper = mount(RouterView, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  wrappers.push(wrapper);
  return { router, wrapper };
}

afterEach(() => {
  wrappers.forEach((wrapper) => wrapper.unmount());
  wrappers.length = 0;
  document.body.innerHTML = '';
});

beforeEach(() => {
  vi.clearAllMocks();
  auth.can.mockImplementation((permission: string) => permission === 'audit.read');
  api.listAuditEvents.mockResolvedValue({
    items: [event],
    pagination: { limit: 20, nextCursor: null },
  });
  api.getAuditEvent.mockResolvedValue(detail);
  api.exportAuditEvents.mockResolvedValue(new Blob(['id,eventType\n'], { type: 'text/csv' }));
});

describe('Audit Trail list page', () => {
  it('renders approved event fields and filters with cursor pagination', async () => {
    const { wrapper } = await mountAuditPage('/audit-trail');
    await flushPromises();

    expect(wrapper.text()).toContain('Category updated');
    expect(wrapper.text()).toContain('Ada Lovelace');
    expect(wrapper.text()).toContain('category · 00000000-0000-4000-8000-000000000012');
    expect(wrapper.text()).toContain('2026-01-31 19:00:00 WIB (UTC+07:00)');
    const eventLink = wrapper.get('a[href="/audit-trail/00000000-0000-4000-8000-000000000010"]');
    expect(eventLink.classes()).toEqual(
      expect.arrayContaining([
        'inline-flex',
        'min-h-11',
        'items-center',
        'text-cms-primary',
        'dark:text-cms-focus',
        'sm:min-h-0',
      ]),
    );
    expect(wrapper.get('button').text()).not.toContain('Export CSV');

    await wrapper.get('input[placeholder="At least 2 characters"]').setValue('Ada');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(api.listAuditEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'Ada', limit: 20 }),
    );
  });

  it('shows permission-gated export and requests CSV after export succeeds', async () => {
    auth.can.mockReturnValue(true);
    const { wrapper } = await mountAuditPage('/audit-trail');
    await flushPromises();

    const exportButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Export CSV'));
    expect(exportButton?.exists()).toBe(true);
    await exportButton?.trigger('click');
    await flushPromises();

    expect(api.exportAuditEvents).toHaveBeenCalledWith(expect.any(Object));
  });

  it('renders empty and unavailable states without fake history', async () => {
    api.listAuditEvents.mockResolvedValueOnce({
      items: [],
      pagination: { limit: 20, nextCursor: null },
    });
    const empty = await mountAuditPage('/audit-trail');
    await flushPromises();
    expect(empty.wrapper.text()).toContain('No audit events found');
    expect(empty.wrapper.find('table').exists()).toBe(false);

    api.listAuditEvents.mockRejectedValueOnce(new ApiError('Network request failed', 'network'));
    const unavailable = await mountAuditPage('/audit-trail');
    await flushPromises();
    expect(unavailable.wrapper.text()).toContain('Audit trail is unavailable. Try again.');
    expect(
      unavailable.wrapper.findAll('button').some((button) => button.text().includes('Try again')),
    ).toBe(true);
  });

  it('denies direct route access when audit.read is absent', async () => {
    auth.can.mockReturnValue(false);
    const { router } = await mountAuditPage('/audit-trail');
    expect(router.currentRoute.value.name).toBe('denied');
    expect(api.listAuditEvents).not.toHaveBeenCalled();
  });
});

describe('Audit event detail page', () => {
  it('renders snapshot changes and system actor without raw metadata', async () => {
    const systemDetail = {
      ...detail,
      actor: { type: 'system' as const, available: true, id: null, displayName: null, email: null },
      changes: { available: false, before: null, after: null },
    };
    api.getAuditEvent.mockResolvedValueOnce(systemDetail);
    const { wrapper } = await mountAuditPage(`/audit-trail/${eventId}`);
    await flushPromises();

    expect(wrapper.text()).toContain('System');
    expect(wrapper.text()).toContain('Change details unavailable');
    expect(wrapper.text()).not.toContain('Old name');
    expect(wrapper.text()).toContain('Read-only event detail');
  });

  it('shows hidden events as unavailable and offers no mutation controls', async () => {
    api.getAuditEvent.mockRejectedValueOnce(new ApiError('Not found', 'http', 404));
    const { wrapper } = await mountAuditPage(`/audit-trail/${eventId}`);
    await flushPromises();

    expect(wrapper.text()).toContain('This audit event is unavailable.');
    expect(wrapper.findAll('button').some((button) => button.text().includes('Delete'))).toBe(
      false,
    );
    expect(wrapper.findAll('button').some((button) => button.text().includes('Edit'))).toBe(false);
  });
});
