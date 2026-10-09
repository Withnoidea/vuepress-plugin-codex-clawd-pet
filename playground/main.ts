import { template } from './template.js';
import { CodexClawdPet, PetRenderer, normalizeTheme } from '../src/core/index.js';
import { luluTheme, showcaseThemes } from './themes.js';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = template;

const labels: Record<string, string> = {
  idle: '自在发呆',
  thinking: '认真思考',
  working: '努力敲代码',
  juggling: '挥手打招呼',
  sleeping: '好梦时间',
  drag: '小步快跑',
  'drag-left': '向左小跑',
  'drag-right': '向右小跑',
  happy: '好耶！',
};
const log = (message: string) => {
  document.querySelector('#event-log')!.textContent =
    `${new Date().toLocaleTimeString('zh-CN', { hour12: false })}  ${message}`;
};
const preview = new PetRenderer(document.querySelector('#portrait')!, (error) =>
  log(error.message),
);
preview.setTheme(luluTheme);
const thumbnails = showcaseThemes.map(({ theme }, index) => {
  const thumbnail = new PetRenderer(document.querySelector(`[data-preview="${index}"]`)!);
  thumbnail.setTheme(normalizeTheme(theme));
  thumbnail.setPaused(true);
  return thumbnail;
});
const pet = new CodexClawdPet({
  themes: showcaseThemes.map(({ theme }) => theme),
  size: 140,
  tips: { welcome: '你好呀，我是噜噜。南瓜帽戴好，今天也陪你慢慢来 🎃' },
  onStateChange: (state) => {
    if (pet.currentTheme) {
      // Toolbar theme switches update the lab without a second widget instance.
      if (pet.currentTheme.id !== previewTheme) syncTheme(pet.currentTheme.id);
    }
    preview.play(state);
    const status = document.querySelector('#status')!;
    status.textContent = `● ${state} · ${labels[state] ?? '观察中'}`;
    document.querySelectorAll<HTMLButtonElement>('[data-state]').forEach((button) => {
      button.classList.toggle('active', button.dataset.state === state);
      button.setAttribute('aria-pressed', String(button.dataset.state === state));
    });
    log(`state → ${state}`);
  },
  onError: (error) => log(error.message),
});
let previewTheme = luluTheme.id;
function syncTheme(id: string) {
  const entry = showcaseThemes.find(({ theme }) => theme.id === id) ?? showcaseThemes[0]!;
  const { theme } = entry;
  previewTheme = theme.id;
  document.querySelector<HTMLElement>('.stage')!.dataset.pet = theme.id;
  preview.setTheme(normalizeTheme(theme));
  document.querySelector('#specimen-name')!.textContent = theme.name;
  document.querySelector('#specimen-sub')!.textContent = entry.subtitle;
  document.querySelector('#intro-pet-note')!.textContent = entry.note;
  document.querySelector('.stage-caption')!.textContent = entry.caption;
  document.querySelector('[data-state="juggling"] span')!.textContent = entry.jugglingLabel;
  labels.juggling = entry.jugglingLabel;
  document.querySelector('#asset-format')!.textContent =
    `WEBP / ${theme.frameWidth} × ${theme.frameHeight}`;
  document.querySelectorAll<HTMLButtonElement>('.theme-choice[data-theme]').forEach((button) => {
    const selected = showcaseThemes[Number(button.dataset.theme)]?.theme.id === theme.id;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}
syncTheme(luluTheme.id);
await pet.mount();
document
  .querySelectorAll<HTMLButtonElement>('[data-state]')
  .forEach((button) => button.addEventListener('click', () => pet.play(button.dataset.state!)));
document.querySelectorAll<HTMLButtonElement>('.theme-choice[data-theme]').forEach((button) =>
  button.addEventListener('click', () => {
    void pet
      .setTheme(showcaseThemes[Number(button.dataset.theme)]!.theme)
      .catch((error) => log(String(error)));
  }),
);
document.querySelector('#portrait')!.addEventListener('click', () => {
  pet.play('happy');
  pet.say('摸摸头，今天也要元气满满 🎃');
});
document.querySelector('#dark')!.addEventListener('click', (event) => {
  const dark = document.documentElement.classList.toggle('dark');
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  (event.currentTarget as HTMLElement).setAttribute('aria-pressed', String(dark));
  log(dark ? '夜间模式已开启' : '回到白天模式');
});
document.querySelector('#message-form')!.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.querySelector<HTMLInputElement>('#message')!;
  if (input.value.trim()) {
    pet.say(input.value.trim());
    log('已发送气泡消息');
    input.value = '';
  }
});
document
  .querySelector('#tips-toggle')!
  .addEventListener('change', (event) =>
    pet.setTipsEnabled((event.target as HTMLInputElement).checked),
  );
document.querySelector('#route-test')!.addEventListener('click', () => {
  pet.notifyRouteChange();
  log('已重置阅读进度');
});
document.querySelector('#copy-code')!.addEventListener('click', async (event) => {
  try {
    await navigator.clipboard.writeText(document.querySelector('#example-code')!.textContent!);
    pet.play('happy');
    pet.say('代码收好啦，灵感 +1！');
    log('代码已复制');
    (event.currentTarget as HTMLButtonElement | null)?.blur();
  } catch {
    log('浏览器未允许复制，请选中代码后手动复制。');
  }
});
const syncVisibility = () => preview.setPaused(document.hidden);
syncVisibility();
document.addEventListener('visibilitychange', syncVisibility);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    document.removeEventListener('visibilitychange', syncVisibility);
    pet.destroy();
    preview.destroy();
    thumbnails.forEach((thumbnail) => thumbnail.destroy());
  });
