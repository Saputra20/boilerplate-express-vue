import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import CmsButton from '../src/components/ui/CmsButton.vue';
import CmsEmptyState from '../src/components/ui/CmsEmptyState.vue';
import CmsInput from '../src/components/ui/CmsInput.vue';
import CmsPasswordInput from '../src/components/ui/CmsPasswordInput.vue';

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
    expect(wrapper.get('#email-error').text()).toBe('Invalid email');
    await wrapper.get('input').setValue('user@example.com');
    const updates = wrapper.emitted('update:modelValue') ?? [];
    expect(updates[updates.length - 1]).toEqual(['user@example.com']);
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

  it('renders intentional empty state without business data', () => {
    const wrapper = mount(CmsEmptyState, {
      props: { title: 'No metrics available', message: 'Dashboard statistics are not configured.' },
    });

    expect(wrapper.text()).toContain('No metrics available');
    expect(wrapper.text()).toContain('Dashboard statistics are not configured.');
  });
});
