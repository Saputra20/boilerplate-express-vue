import { mount } from '@vue/test-utils';
import App from '../src/App.vue';

describe('CMS shell', () => {
  it('renders its foundation state', () => {
    expect(mount(App).get('h1').text()).toBe('CMS foundation');
  });
});
