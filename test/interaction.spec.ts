import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { bubble, harness, mutations, petButton, queries, root, scroll } from './support.js';
import { property } from './setup.js';

const mount = harness();
const tips = {
  welcome: 'WELCOME',
  poke: ['POKE'],
  copy: 'COPIED',
  duration: 1000,
  reading: { 0: 'START', 50: 'HALFWAY', 100: 'COMPLETE' },
};

describe('click, toolbar and blog integration', () => {
  it('click triggers happy and an accessible text-only tip that expires exactly', async () => {
    const pet = await mount({ tips });
    expect(bubble(pet).textContent).toBe('WELCOME');
    fireEvent.click(petButton(pet));
    expect(pet.state).toBe('happy');
    expect(bubble(pet).textContent).toBe('POKE');
    expect(bubble(pet).getAttribute('aria-live')).toBe('polite');
    pet.say('<img src=x onerror=alert(1)>', 1000);
    expect(bubble(pet).children).toHaveLength(0);
    vi.advanceTimersByTime(999);
    expect(bubble(pet).hidden).toBe(false);
    vi.advanceTimersByTime(1);
    expect(bubble(pet).hidden).toBe(true);
  });
  it('emits 0/50/100 once per route, within the documented 0.5% tolerance', async () => {
    const pet = await mount({ tips });
    pet.notifyRouteChange();
    expect(bubble(pet).textContent).toBe('START');
    scroll(494);
    expect(bubble(pet).textContent).toBe('START');
    scroll(500);
    expect(bubble(pet).textContent).toBe('HALFWAY');
    pet.say('KEEP');
    scroll(750);
    expect(bubble(pet).textContent).toBe('KEEP');
    scroll(994);
    expect(bubble(pet).textContent).toBe('KEEP');
    scroll(1000);
    expect(bubble(pet).textContent).toBe('COMPLETE');
    expect(pet.state).toBe('happy');
    pet.say('ONCE');
    scroll(0);
    scroll(1000);
    expect(bubble(pet).textContent).toBe('ONCE');
    scroll(0);
    pet.notifyRouteChange();
    scroll(500);
    expect(bubble(pet).textContent).toBe('HALFWAY');
  });
  it('coalesces scroll bursts and handles a direct jump to the bottom', async () => {
    const pet = await mount({ tips });
    const say = vi.spyOn(pet, 'say');
    property(window, 'scrollY', 1000);
    for (let i = 0; i < 20; i++) fireEvent.scroll(window);
    expect(say).not.toHaveBeenCalled();
    vi.advanceTimersToNextFrame();
    expect(say).toHaveBeenCalledExactlyOnceWith('COMPLETE');
  });
  it('does not invent reading progress on a non-scrollable page or when disabled', async () => {
    const pet = await mount({ tips });
    property(document.documentElement, 'scrollHeight', window.innerHeight);
    scroll(1000);
    expect(bubble(pet).textContent).toBe('WELCOME');
    const disabled = await mount({ tips: { ...tips, reading: false } });
    disabled.notifyRouteChange();
    scroll(1000);
    expect(bubble(disabled).textContent).toBe('WELCOME');
  });
  it.each(['sleep', 'dim'] as const)(
    'observes html.dark automatically with %s behavior',
    async (darkBehavior) => {
      const pet = await mount({ darkMode: 'auto', darkBehavior });
      document.documentElement.classList.add('dark');
      await mutations();
      expect(pet.element?.dataset.dark).toBe('true');
      expect(pet.element?.dataset.dim).toBe(String(darkBehavior === 'dim'));
      expect(pet.state).toBe(darkBehavior === 'sleep' ? 'sleeping' : 'idle');
      document.documentElement.classList.remove('dark');
      await mutations();
      expect(pet.element?.dataset.dark).toBe('false');
      expect(pet.state).toBe('idle');
    },
  );
  it('respects system dark mode and an explicit data-theme=light override', async () => {
    const media = Object.assign(new EventTarget(), { matches: false });
    vi.mocked(window.matchMedia).mockReturnValue(media as MediaQueryList);
    const pet = await mount({ darkBehavior: 'sleep' });
    media.matches = true;
    media.dispatchEvent(new Event('change'));
    expect(pet.state).toBe('sleeping');
    document.documentElement.dataset.theme = 'light';
    await mutations();
    expect(pet.state).toBe('idle');
  });
  it('cheers code copy events, deduplicates bursts, and ignores ordinary text', async () => {
    const pet = await mount({ tips });
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    pre.append(code);
    document.body.append(pre);
    const say = vi.spyOn(pet, 'say');
    fireEvent.copy(document.body);
    expect(say).not.toHaveBeenCalled();
    fireEvent.copy(code);
    expect(bubble(pet).textContent).toBe('COPIED');
    expect(pet.state).toBe('happy');
    fireEvent.copy(code);
    expect(say).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(600);
    fireEvent.copy(code);
    expect(say).toHaveBeenCalledTimes(2);
  });
  it('toolbar switches tips, minimizes/restores, and scrolls to top', async () => {
    const pet = await mount({ tips });
    const q = queries(pet);
    const toggle = q.getByRole('button', { name: '开关对话气泡' });
    fireEvent.click(toggle);
    pet.say('HIDDEN');
    expect(bubble(pet).hidden).toBe(true);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);
    fireEvent.click(q.getByRole('button', { name: '收起桌宠' }));
    expect(pet.element?.dataset.paused).toBe('true');
    expect(root(pet).activeElement?.getAttribute('aria-label')).toBe('展开桌宠');
    fireEvent.click(q.getByRole('button', { name: '展开桌宠' }));
    expect(pet.element?.dataset.paused).toBe('false');
    fireEvent.click(q.getByRole('button', { name: '返回顶部' }));
    expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0, behavior: 'smooth' });
  });
  it('visibilitychange pauses controlled atlas animation and resumes it', async () => {
    const pet = await mount();
    property(document, 'hidden', true);
    fireEvent(document, new Event('visibilitychange'));
    expect(root(pet).querySelector('image')?.style.animationPlayState).toBe('paused');
    property(document, 'hidden', false);
    fireEvent(document, new Event('visibilitychange'));
    expect(root(pet).querySelector('image')?.style.animationPlayState).toBe('running');
  });
});
