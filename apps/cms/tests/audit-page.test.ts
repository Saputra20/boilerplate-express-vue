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
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  });
  api.getAuditEvent.mockResolvedValue(detail);
  api.exportAuditEvents.mockResolvedValue(new Blob(['id,eventType\n'], { type: 'text/csv' }));
});

describe('Audit Trail list page', () => {
  it('renders approved event fields and filters with page pagination', async () => {
    const { wrapper } = await mountAuditPage('/audit-trail');
    await flushPromises();

    expect(wrapper.text()).toContain('Category updated');
    expect(wrapper.text()).toContain('Ada Lovelace');
    expect(wrapper.text()).toContain('category · 00000000-0000-4000-8000-000000000012');
    expect(wrapper.text()).toContain('2026-01-31 19:00:00 WIB (UTC+07:00)');
    expect(wrapper.text()).toContain('Event times are shown in WIB (UTC+07:00).');
    expect(wrapper.text()).not.toContain('Read-only history');
    expect(wrapper.text()).not.toContain('generic audit history');
    expect(wrapper.findAll('fieldset legend').map((legend) => legend.text())).toEqual([
      'Date range and search',
      'Exact filters',
    ]);
    expect(wrapper.get('input[id="audit-search"]').attributes('maxlength')).toBe('120');
    expect(wrapper.findAll('h2').map((heading) => heading.text())).toContain('Filters');
    expect(wrapper.find('ul[aria-label="Audit events"]').exists()).toBe(true);
    expect(wrapper.get('ul[aria-label="Audit events"]').classes()).toContain('2xl:hidden');
    expect(wrapper.get('div.hidden.overflow-x-auto').classes()).toContain('2xl:block');
    const eventLinks = wrapper.findAll(
      'a[href="/audit-trail/00000000-0000-4000-8000-000000000010"]',
    );
    expect(eventLinks).toHaveLength(4);
    expect(eventLinks[0]?.classes()).toEqual(
      expect.arrayContaining([
        'inline-flex',
        'min-h-11',
        'text-cms-primary',
        'dark:text-cms-focus',
        'focus-visible:ring-2',
      ]),
    );
    expect(eventLinks[2]?.classes()).toEqual(
      expect.arrayContaining([
        'inline-flex',
        'min-h-11',
        'items-center',
        'text-cms-primary',
        'dark:text-cms-focus',
        'sm:min-h-0',
      ]),
    );
    expect(wrapper.findAll('[aria-label="View details for Category updated"]')).toHaveLength(2);
    expect(wrapper.get('button').text()).not.toContain('Export CSV');

    await wrapper.get('input[placeholder="Name, resource type, or ID"]').setValue('Ada');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(api.listAuditEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'Ada', limit: 10 }),
    );
    const rows = wrapper.get('select[aria-label="Rows per page"]');
    expect(rows.findAll('option').map((option) => option.text())).toEqual([
      '10',
      '20',
      '50',
      '100',
    ]);
    expect((rows.element as HTMLSelectElement).value).toBe('10');
    expect(wrapper.text()).toContain('Rows per page');
    expect(wrapper.text()).toContain('Showing 1 to 1 of 1 events');
  });

  it('resets page pagination when page size changes and navigates by page', async () => {
    api.listAuditEvents
      .mockResolvedValueOnce({
        items: [event],
        pagination: { page: 1, limit: 10, total: 21, totalPages: 3 },
      })
      .mockResolvedValueOnce({
        items: [event],
        pagination: { page: 1, limit: 20, total: 21, totalPages: 2 },
      });
    const { wrapper } = await mountAuditPage('/audit-trail');
    await flushPromises();

    await wrapper.get('select[aria-label="Rows per page"]').setValue('20');
    await flushPromises();
    expect(api.listAuditEvents).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 20 }));
    expect(api.listAuditEvents.mock.calls[1]?.[0]).toHaveProperty('page', 1);

    api.listAuditEvents.mockResolvedValueOnce({
      items: [event],
      pagination: { page: 2, limit: 20, total: 21, totalPages: 2 },
    });
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Next')
      ?.trigger('click');
    await flushPromises();
    expect(api.listAuditEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, limit: 20 }),
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
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
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
  it('explains an empty successful export and copies both event identifiers', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    api.getAuditEvent.mockResolvedValueOnce({
      ...detail,
      eventType: 'audit.exported',
      label: 'Audit trail exported',
      actor: { ...detail.actor, displayName: null },
      resource: { type: null, id: null },
      exportSummary: {
        rowCount: 0,
        from: new Date('2026-09-07T07:21:27.000Z'),
        to: new Date('2026-10-07T07:21:27.000Z'),
        filters: {
          action: null,
          actorId: null,
          resourceType: null,
          resourceId: null,
          outcome: null,
        },
        searchApplied: false,
      },
    });
    const { wrapper } = await mountAuditPage(`/audit-trail/${eventId}`);
    await flushPromises();

    expect(wrapper.text()).toContain('Audit Event');
    expect(wrapper.text()).toContain('Audit trail exported');
    expect(wrapper.text()).toContain('Export completed successfully');
    expect(wrapper.text()).toContain(
      'The export process finished, but no records matched the selected criteria.',
    );
    expect(wrapper.text()).toContain('Export summary');
    expect(wrapper.text()).toContain('0');
    expect(wrapper.text()).toContain('7 Oct 2026, 14:21:27 WIB');
    expect(wrapper.text()).toContain('UTC+07:00');

    await wrapper.get('button[aria-label="Copy actor ID"]').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(actorId);
    expect(wrapper.text()).toContain('Actor ID copied');

    await wrapper.get('button[aria-label="Copy request ID"]').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(detail.requestId);
    expect(wrapper.text()).toContain('Request ID copied');
  });

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
    expect(wrapper.text()).not.toContain('Read-only event detail');
    expect(
      wrapper
        .findAll('a[href="/audit-trail"]')
        .some((link) => link.text().trim() === 'Back to Audit Trail'),
    ).toBe(true);
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
