import type { PetThemeConfig } from '../src/core/types.js';
import { capybaraTheme, normalizeTheme } from '../src/core/index.js';
import manifest from './themes/lulu/pet.json';

// Import the original atlas once; Vite handles hashed URLs and deployment base paths.
const codexLulu = normalizeTheme({
  ...manifest,
  spritesheetPath: new URL('./themes/lulu/spritesheet.webp', import.meta.url).href,
});
export const luluTheme: PetThemeConfig = {
  ...codexLulu,
  actions: {
    ...codexLulu.actions,
    idle: codexLulu.actions.idle,
    // Clawd clickLeft/clickRight use jumping-once (840 ms), not a looping jump.
    happy: { ...codexLulu.actions.happy!, loop: false, duration: 840 },
    sweeping: codexLulu.actions.working!,
    carrying: codexLulu.actions.working!,
  },
};

export const showcaseThemes = [
  {
    theme: luluTheme,
    shortName: '噜噜',
    subtitle: 'C. capybara / pumpkin & leaf',
    note: '噜噜带着小南瓜来陪你了。',
    caption: '南瓜帽戴好，慢慢来也很好。',
    jugglingLabel: '挥挥手',
  },
  {
    theme: capybaraTheme,
    shortName: '柚子',
    subtitle: 'C. capybara / citrus edition',
    note: '柚子今天也在摸鱼。',
    caption: '一颗柚子，适量发呆。',
    jugglingLabel: '抛柚子',
  },
];
