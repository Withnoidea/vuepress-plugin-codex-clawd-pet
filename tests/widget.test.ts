import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { CodexClawdPet, capybaraTheme, moonTheme, resolveOptions } from '../src/core/index.js';
let pets: CodexClawdPet[] = [];
const mount = async (options: ConstructorParameters<typeof CodexClawdPet>[0] = {}) => {
  const pet = new CodexClawdPet(options);
  pets.push(pet);
  await pet.mount();
  return pet;
};
const shadow = (pet: CodexClawdPet) => pet.element!.shadowRoot!;
const bubble = (pet: CodexClawdPet) => shadow(pet).querySelector<HTMLDivElement>('.bubble')!;
beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  pets.forEach((pet) => pet.destroy());
  pets = [];
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
  document.documentElement.className = '';
  delete document.documentElement.dataset.theme;
});

describe('widget integration', () => {
  it('normalizes option defaults, nested overrides and disabled tips', () => {
    expect(resolveOptions({ offset: { x: 9 } }).offset).toEqual({ x: 9, y: 20 });
    expect(resolveOptions({ tips: false }).tips.enabled).toBe(false);
    expect(resolveOptions({ size: NaN }).size).toBe(160);
  });
  it('mounts only once, shows welcome, and makes no external requests by default', async () => {
    const pet = await mount();
    await pet.mount();
    expect(document.querySelectorAll('.codex-clawd-pet')).toHaveLength(1);
    expect(bubble(pet).textContent).toContain('你好');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('treats bubble content as text, supports disable/enable and expiration', async () => {
    const pet = await mount();
    pet.say('<img src=x onerror=alert(1)>', 100);
    expect(bubble(pet).querySelector('img')).toBeNull();
    expect(bubble(pet).textContent).toContain('<img');
    vi.advanceTimersByTime(100);
    expect(bubble(pet).hidden).toBe(true);
    pet.setTipsEnabled(false);
    pet.say('hidden');
    expect(bubble(pet).hidden).toBe(true);
    pet.setTipsEnabled(true);
    pet.say('visible');
    expect(bubble(pet).hidden).toBe(false);
  });
  it('responds to keyboard-compatible click and cycles themes', async () => {
    const pet = await mount();
    shadow(pet).querySelector<HTMLButtonElement>('.pet')!.click();
    expect(pet.state).toBe('happy');
    await pet.nextTheme();
    expect(pet.currentTheme?.id).toBe(moonTheme.id);
    await pet.nextTheme();
    expect(pet.currentTheme?.id).toBe(capybaraTheme.id);
  });
  it('minimizes and resumes without creating another pet', async () => {
    const pet = await mount();
    pet.setMinimized(true);
    expect(shadow(pet).querySelector<HTMLButtonElement>('.restore')!.hidden).toBe(false);
    expect(pet.element?.dataset.paused).toBe('true');
    pet.setMinimized(false);
    expect(pet.element?.dataset.paused).toBe('false');
  });
  it('follows dark mode and returns to sleep after a poke', async () => {
    const pet = await mount({ darkBehavior: 'sleep' });
    pet.setDarkMode('dark');
    expect(pet.state).toBe('sleeping');
    pet.play('happy', 30);
    vi.advanceTimersByTime(30);
    expect(pet.state).toBe('sleeping');
    pet.setDarkMode('auto');
    document.documentElement.dataset.theme = 'dark';
    await Promise.resolve();
    expect(pet.element?.dataset.dark).toBe('true');
    document.documentElement.dataset.theme = 'light';
    await Promise.resolve();
    expect(pet.state).toBe('idle');
  });
  it('celebrates code copy buttons but not unrelated clicks', async () => {
    const pet = await mount();
    const button = document.createElement('button');
    document.body.append(button);
    button.click();
    expect(pet.state).toBe('idle');
    button.className = 'copy-code-button';
    button.click();
    expect(pet.state).toBe('happy');
    expect(bubble(pet).textContent).toContain('代码');
  });
  it('fires reading milestones once per route and handles jumping to the bottom', async () => {
    const pet = await mount();
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 1768,
    });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 510 });
    window.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(20);
    expect(bubble(pet).textContent).toContain('一半');
    pet.say('keep');
    window.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(20);
    expect(bubble(pet).textContent).toBe('keep');
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1000 });
    window.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(20);
    expect(bubble(pet).textContent).toContain('撒花');
    pet.notifyRouteChange();
    expect(bubble(pet).textContent).toContain('新的一页');
  });
  it('clamps dragging, handles pointer cancellation and docks without a physics loop', async () => {
    const pet = await mount();
    const button = shadow(pet).querySelector<HTMLButtonElement>('.pet')!;
    const pointer = (type: string, x: number, y: number) => {
      const event = new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      button.dispatchEvent(event);
    };
    pointer('pointerdown', 900, 650);
    pointer('pointermove', -2000, -2000);
    expect(pet.state).toBe('drag');
    expect(pet.element?.style.transform).toBe('translate3d(0px,0px,0)');
    pointer('pointercancel', -2000, -2000);
    expect(pet.state).toBe('idle');
    expect(pet.element?.style.transform).toMatch(/translate3d\(24px,/);
  });
  it('shrinks for a narrow viewport', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 180 });
    const pet = await mount({ size: 400 });
    expect(Number.parseFloat(pet.element!.style.width)).toBeLessThanOrEqual(180);
  });
  it('ignores stale theme loads and preserves the current theme after errors', async () => {
    let resolve!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const pet = await mount();
    const slow = pet.setTheme('https://example.com/slow/theme.json');
    await pet.setTheme(moonTheme);
    resolve({ ok: true, json: async () => capybaraTheme } as Response);
    await slow;
    expect(pet.currentTheme?.id).toBe(moonTheme.id);
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404 } as Response);
    await expect(pet.setTheme('https://example.com/bad')).rejects.toThrow('404');
    expect(pet.currentTheme?.id).toBe(moonTheme.id);
  });
  it('handles opt-in quotes, hostile text and offline failure', async () => {
    const onError = vi.fn();
    const pet = await mount({ tips: { hitokoto: true }, onError });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hitokoto: '<script>no</script>' }),
    } as Response);
    expect(await pet.fetchQuote()).toBe(true);
    expect(bubble(pet).querySelector('script')).toBeNull();
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
    expect(await pet.fetchQuote()).toBe(false);
    expect(onError).toHaveBeenCalled();
  });
  it('cleans every listener, animation timer and mounted node on destroy', async () => {
    const onStateChange = vi.fn();
    const pet = await mount({ onStateChange, tips: { hitokoto: true } });
    pet.play('happy', 100);
    pet.destroy();
    pet.destroy();
    onStateChange.mockClear();
    window.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(70000);
    expect(document.querySelector('.codex-clawd-pet')).toBeNull();
    expect(onStateChange).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    await expect(pet.mount()).rejects.toThrow('destroyed');
  });
});
