import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import CmsButton from '../src/components/ui/CmsButton.vue';
import CmsDropdown from '../src/components/ui/CmsDropdown.vue';
import CmsEmptyState from '../src/components/ui/CmsEmptyState.vue';
import CmsInput from '../src/components/ui/CmsInput.vue';
import CmsPasswordInput from '../src/components/ui/CmsPasswordInput.vue';
import CmsModal from '../src/components/ui/CmsModal.vue';
import CmsSelect from '../src/components/ui/CmsSelect.vue';
import CmsPagination from '../src/components/ui/CmsPagination.vue';
import CmsTable from '../src/components/ui/CmsTable.vue';

describe('CMS UI primitives', () => {
  it('exposes labeled input state and emits model updates', async () => {
    const wrapper = mount(CmsInput, {
      props: {
        id: 'email',
        label: 'Email',
        modelValue: '',
        error: 'Invalid email',
        errorId: 'email-error',
      },
    });

    expect(wrapper.get('label').text()).toContain('Email');
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
    expect(wrapper.get('input').attributes('aria-describedby')).toBe('email-error');
    expect(wrapper.get('#email-error').text()).toBe('Invalid email');
    await wrapper.get('input').setValue('user@example.com');
    const updates = wrapper.emitted('update:modelValue') ?? [];
    expect(updates[updates.length - 1]).toEqual(['user@example.com']);
  });

  it('associates password and select errors with their controls', () => {
    const password = mount(CmsPasswordInput, {
      props: { id: 'password', error: 'Required', errorId: 'password-error' },
    });
    const select = mount(CmsSelect, {
      props: { label: 'Role', error: 'Choose a role', errorId: 'role-error' },
      slots: { default: '<option value="">Choose</option>' },
    });

    expect(password.get('input').attributes('aria-describedby')).toBe('password-error');
    expect(select.get('select').attributes('aria-describedby')).toBe('role-error');
  });

  it('supports password visibility and loading button state', async () => {
    const password = mount(CmsPasswordInput, { props: { id: 'password', modelValue: 'secret' } });
    expect(password.get('input').attributes('type')).toBe('password');
    await password.get('button').trigger('click');
    expect(password.get('input').attributes('type')).toBe('text');

    const button = mount(CmsButton, { props: { loading: true } });
    expect(button.get('button').attributes('disabled')).toBeDefined();
    expect(button.get('[aria-hidden="true"]')).toBeTruthy();
  });

  it('closes an action dropdown and restores focus to its trigger', async () => {
    const wrapper = mount(CmsDropdown, {
      attachTo: document.body,
      props: { label: 'Row actions' },
      slots: {
        trigger: '<span>More</span>',
        default: '<button type="button">Edit</button>',
      },
    });

    await wrapper.get('summary').trigger('click');
    expect(wrapper.get('details').attributes('open')).toBeDefined();
    await wrapper.get('details > div button').trigger('click');

    expect(wrapper.get('details').attributes('open')).toBeUndefined();
    expect(document.activeElement).toBe(wrapper.get('summary').element);

    await wrapper.get('summary').trigger('click');
    await wrapper.get('details').trigger('keydown', { key: 'Escape' });
    expect(wrapper.get('details').attributes('open')).toBeUndefined();
    wrapper.unmount();
  });

  it('renders intentional empty state without business data', () => {
    const wrapper = mount(CmsEmptyState, {
      props: { title: 'No metrics available', message: 'Dashboard statistics are not configured.' },
    });

    expect(wrapper.text()).toContain('No metrics available');
    expect(wrapper.text()).toContain('Dashboard statistics are not configured.');
  });

  it('renders a table toolbar and a server-derived record range', () => {
    const wrapper = mount(CmsTable, {
      props: {
        title: 'Users',
        totalRecords: 47,
        page: 2,
        pageSize: 10,
        itemLabel: 'users',
        searchTerm: '',
        searchLabel: 'Search users by email',
      },
      slots: {
        default: '<tbody><tr><td>user@example.com</td></tr></tbody>',
      },
    });

    expect(wrapper.get('h2').text()).toBe('Users');
    expect(
      (wrapper.get('select[aria-label="Entries per page"]').element as HTMLSelectElement).value,
    ).toBe('10');
    expect(wrapper.get('input[aria-label="Search users by email"]')).toBeTruthy();
    expect(wrapper.get('tbody').text()).toContain('user@example.com');
    expect(wrapper.get('footer').text()).toContain('Showing 11 to 20 of 47 users');
  });

  it('keeps the toolbar available while displaying a data state', () => {
    const wrapper = mount(CmsTable, {
      props: {
        title: 'Categories',
        totalRecords: 0,
        page: 1,
        pageSize: 10,
        itemLabel: 'categories',
        searchTerm: '',
        searchLabel: 'Search categories',
        showState: true,
      },
      slots: {
        state: '<p>No categories found</p>',
        default: '<tbody><tr><td>must not render</td></tr></tbody>',
      },
    });

    expect(wrapper.get('select[aria-label="Entries per page"]')).toBeTruthy();
    expect(wrapper.get('input[aria-label="Search categories"]')).toBeTruthy();
    expect(wrapper.text()).toContain('No categories found');
    expect(wrapper.text()).not.toContain('must not render');
  });

  it('emits page size and search changes from table controls', async () => {
    const wrapper = mount(CmsTable, {
      props: {
        title: 'Roles',
        totalRecords: 47,
        page: 1,
        pageSize: 10,
        itemLabel: 'roles',
        searchTerm: '',
        searchLabel: 'Search roles',
      },
    });

    await wrapper.get('select[aria-label="Entries per page"]').setValue('20');
    expect(wrapper.emitted('update:pageSize')).toEqual([[20]]);
    await wrapper.get('input[aria-label="Search roles"]').setValue('editor');
    expect(wrapper.emitted('update:searchTerm')).toEqual([['editor']]);
    await wrapper.get('form[role="search"]').trigger('submit');
    expect(wrapper.emitted('search')).toHaveLength(1);
  });

  it('shows numbered pages and emits the selected page', async () => {
    const wrapper = mount(CmsPagination, { props: { page: 2, totalPages: 3 } });
    const currentPage = wrapper.get('[aria-current="page"]');

    expect(currentPage.text()).toBe('2');
    await wrapper.get('button[aria-label="Go to page 3"]').trigger('click');
    expect(wrapper.emitted('change')).toEqual([[3]]);
  });

  it('keeps one-page pagination visible with navigation disabled', () => {
    const wrapper = mount(CmsPagination, { props: { page: 1, totalPages: 1 } });

    expect(wrapper.get('[aria-current="page"]').text()).toBe('1');
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
    expect(wrapper.get('button:last-child').attributes('disabled')).toBeDefined();
  });

  it('closes an open dialog with Escape and traps focus at its edges', async () => {
    const wrapper = mount(CmsModal, {
      attachTo: document.body,
      props: { open: false, title: 'Edit record' },
      slots: { default: '<input aria-label="First field" />' },
    });
    await wrapper.setProps({ open: true });
    await wrapper.vm.$nextTick();
    const first = document.querySelector<HTMLInputElement>('[aria-label="First field"]');
    const close = document.querySelector<HTMLButtonElement>('[aria-label="Close dialog"]');
    expect(document.activeElement).toBe(close);

    close?.focus();
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    );
    expect(document.activeElement).toBe(first);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
  });
});
