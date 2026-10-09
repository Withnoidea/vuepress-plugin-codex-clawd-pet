import { ClientOnly, defineClientConfig } from '@vuepress/client';
import { defineComponent, h } from 'vue';
import { PetWidget } from './PetWidget.js';
export default defineClientConfig({
  rootComponents: [
    defineComponent({
      name: 'CodexClawdPetClientOnly',
      setup: () => () => h(ClientOnly, null, { default: () => h(PetWidget) }),
    }),
  ],
});
