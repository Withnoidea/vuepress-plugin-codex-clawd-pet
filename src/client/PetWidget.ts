import { defineComponent, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRoute, withBase } from '@vuepress/client';
import { publicTheme } from './options.js';
import { CodexClawdPet } from '../core/CodexClawdPet.js';
import type { VuePressPetOptions } from '../core/types.js';

declare const __CODEX_CLAWD_PET_OPTIONS__: VuePressPetOptions;

export const PetWidget = defineComponent({
  name: 'CodexClawdPetWidget',
  setup() {
    const route = useRoute();
    let pet: CodexClawdPet | undefined;
    let alive = true;
    onMounted(async () => {
      const options = __CODEX_CLAWD_PET_OPTIONS__;
      pet = new CodexClawdPet({
        ...options,
        theme: options.theme ? publicTheme(options.theme, withBase) : undefined,
        themes: options.themes?.map((theme) => publicTheme(theme, withBase)),
      });
      try {
        await pet.mount();
      } catch (error) {
        if (alive) console.warn('[codex-clawd-pet] Mount failed:', error);
      }
    });
    watch(
      () => route.fullPath,
      async () => {
        await nextTick();
        if (alive) pet?.notifyRouteChange();
      },
      { flush: 'post' },
    );
    onBeforeUnmount(() => {
      alive = false;
      pet?.destroy();
      pet = undefined;
    });
    return () => null;
  },
});
