import { fileURLToPath } from 'node:url';
import type { PluginObject } from '@vuepress/core';
import type { VuePressPetOptions } from '../core/types.js';
export type {
  VuePressPetOptions,
  CodexClawdPetOptions,
  PetThemeConfig,
  PetState,
  TipsConfig,
} from '../core/types.js';

export function codexClawdPetPlugin(options: VuePressPetOptions = {}): PluginObject {
  // Reject callbacks / cyclic objects rather than silently dropping client settings.
  const json = JSON.stringify(options, (_key, value: unknown) => {
    if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint')
      throw new Error('Pet plugin options must be JSON serializable');
    return value;
  });
  const user = JSON.parse(json) as VuePressPetOptions;
  const merged: VuePressPetOptions = {
    position: 'bottom-right',
    size: 160,
    draggable: true,
    dock: true,
    toolbar: true,
    darkMode: 'auto',
    darkBehavior: 'dim',
    ...user,
    offset: { x: 24, y: 20, ...user.offset },
    tips: user.tips === false ? false : { enabled: true, duration: 4500, ...user.tips },
  };
  return {
    name: 'vuepress-plugin-codex-clawd-pet',
    clientConfigFile: fileURLToPath(new URL('../client/config.js', import.meta.url)).replace(
      /\\/g,
      '/',
    ),
    define: { __CODEX_CLAWD_PET_OPTIONS__: merged },
  };
}
export default codexClawdPetPlugin;
