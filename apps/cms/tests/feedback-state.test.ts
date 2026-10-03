import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import FeedbackState from '../src/components/FeedbackState.vue';

describe('FeedbackState', () => {
  it.each([
    ['error', 'Something went wrong'],
    ['unavailable', 'Service unavailable'],
    ['denied', 'Access denied'],
  ] as const)('renders the %s state', (kind, title) => {
    const wrapper = mount(FeedbackState, {
      props: { kind, message: 'Safe contextual message' },
    });

    expect(wrapper.attributes('role')).toBe('alert');
    expect(wrapper.text()).toContain(title);
    expect(wrapper.text()).toContain('Safe contextual message');
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('uses contrast-safe denied tone classes in both themes', () => {
    const wrapper = mount(FeedbackState, {
      props: { kind: 'denied', message: 'Access denied' },
    });

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        'text-cms-warning-strong',
        'dark:bg-amber-950/30',
        'dark:text-cms-warning-light',
      ]),
    );
  });

  it('renders retry only when explicitly enabled', async () => {
    const wrapper = mount(FeedbackState, {
      props: { kind: 'unavailable', message: 'Try again later', retryable: true },
    });

    await wrapper.get('button').trigger('click');

    expect(wrapper.emitted('retry')).toHaveLength(1);
  });
});
