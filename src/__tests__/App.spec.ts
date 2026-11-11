import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import router from '../router';
import App from '../App.vue';

describe('App', () => {
  it('mounts properly with pinia', () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router],
        stubs: {
          RouterView: true,
          Navbar: true,
          Footer: true,
          ToastNotification: true,
          FaqModal: true,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
  });
});
