import type { CodexClawdPetOptions, PetThemeConfig, ResolvedPetOptions } from './types.js';

export const capybaraTheme: PetThemeConfig = {
  id: 'capybara',
  name: '柚子 · 水豚',
  spritesheet: new URL('../themes/capybara/spritesheet.webp', import.meta.url).href,
  frameWidth: 192,
  frameHeight: 208,
  columns: 6,
  rows: 7,
  fps: 6,
  actions: Object.fromEntries(
    ['idle', 'thinking', 'working', 'juggling', 'sleeping', 'drag', 'happy'].map((name, row) => [
      name,
      { frames: Array.from({ length: 6 }, (_, i) => row * 6 + i) },
    ]),
  ) as PetThemeConfig['actions'],
};
export const moonTheme: PetThemeConfig = {
  ...capybaraTheme,
  id: 'moon-capybara',
  name: '月白 · 水豚',
  spritesheet: new URL('../themes/moon/spritesheet.svg', import.meta.url).href,
};
const finite = (value: number | undefined, fallback: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value!)) : fallback;

export function resolveOptions(options: CodexClawdPetOptions = {}): ResolvedPetOptions {
  const tips = options.tips === false ? { enabled: false } : options.tips;
  return {
    ...options,
    theme: options.theme ?? options.themes?.[0] ?? capybaraTheme,
    themes: options.themes?.length
      ? [...options.themes]
      : [options.theme ?? capybaraTheme, moonTheme],
    position: options.position ?? 'bottom-right',
    size: finite(options.size, 160, 48, 512),
    offset: {
      x: finite(options.offset?.x, 24, 0, 10000),
      y: finite(options.offset?.y, 20, 0, 10000),
    },
    draggable: options.draggable ?? true,
    dock: options.dock ?? true,
    darkMode: options.darkMode ?? 'auto',
    darkBehavior: options.darkBehavior ?? 'dim',
    toolbar: options.toolbar ?? true,
    zIndex: Math.round(finite(options.zIndex, 1000, 0, 2147483647)),
    tips: {
      enabled: tips?.enabled ?? true,
      duration: finite(tips?.duration, 4500, 100, 60000),
      welcome: tips?.welcome ?? ['你好呀，我是柚子。今天也陪你读一会儿。'],
      poke: tips?.poke ?? ['摸鱼被发现了！', '别急，慢慢来。', '给你一颗小柚子 🍊'],
      copy: tips?.copy ?? '代码收好啦，灵感 +1！',
      reading:
        tips?.reading === false
          ? false
          : {
              0: '新的一页，出发！',
              50: '读到一半啦，伸个懒腰。',
              100: '读完啦！给认真阅读的你撒花 ✨',
              ...tips?.reading,
            },
      hitokoto: tips?.hitokoto ?? false,
    },
  };
}
