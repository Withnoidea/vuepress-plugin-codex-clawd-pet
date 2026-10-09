import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { CodexClawdPet } from '../src/core/CodexClawdPet.js';
import { bubble, harness, mutations, petButton, pointer } from './support.js';

const mount = harness();

describe('destroy and resource ownership', () => {
  it('removes DOM, aborts global listeners, disconnects observers and clears timers/RAF', async () => {
    const windowListeners = vi.spyOn(window, 'addEventListener');
    const documentListeners = vi.spyOn(document, 'addEventListener');
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const onStateChange = vi.fn();
    const pet = await mount({ onStateChange, tips: { hitokoto: true } });
    const host = pet.element!;
    const button = petButton(pet);
    const status = bubble(pet);
    const listeners = [...windowListeners.mock.calls, ...documentListeners.mock.calls]
      .filter(([type]) => ['resize', 'scroll', 'copy', 'click', 'visibilitychange'].includes(type))
      .map(([type, , options]) => ({ type, signal: (options as AddEventListenerOptions)?.signal }));
    expect(listeners.map(({ type }) => type)).toEqual(
      expect.arrayContaining(['resize', 'scroll', 'copy']),
    );
    expect(listeners.every(({ signal }) => signal && !signal.aborted)).toBe(true);
    pet.play('juggling', 800);
    pet.say('PENDING', 1000);
    fireEvent.scroll(window); // Leave the coalesced RAF queued.
    expect(vi.getTimerCount()).toBeGreaterThanOrEqual(4);
    pet.destroy();
    pet.destroy();
    expect(host.isConnected).toBe(false);
    expect(document.querySelector('.codex-clawd-pet')).toBeNull();
    expect(pet.element).toBeUndefined();
    expect(host.shadowRoot!.querySelector('.ccp-renderer')).toBeNull();
    expect(listeners.every(({ signal }) => signal?.aborted)).toBe(true);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    onStateChange.mockClear();
    const before = host.style.cssText;
    const code = document.createElement('code');
    document.body.append(code);
    fireEvent.resize(window);
    fireEvent.scroll(window);
    fireEvent.copy(code);
    fireEvent.click(button);
    pointer(button, 'down', 800, 600);
    pointer(button, 'move', -1000, -1000);
    document.documentElement.classList.add('dark');
    await mutations();
    vi.advanceTimersByTime(120000);
    expect(onStateChange).not.toHaveBeenCalled();
    expect(host.style.cssText).toBe(before);
    expect(status.textContent).toBe('PENDING');
    expect(fetch).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    await expect(pet.mount()).rejects.toThrow('destroyed');
  });
  it('aborts an in-flight quote and removes both interval and request timeout', async () => {
    const pet = await mount({ tips: { hitokoto: true } });
    let signal: AbortSignal | undefined;
    vi.mocked(fetch).mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          signal = init?.signal ?? undefined;
          signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    );
    const result = pet.fetchQuote();
    expect(signal?.aborted).toBe(false);
    pet.destroy();
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(await result).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('aborts an in-flight theme switch and ignores its late response', async () => {
    const pet = await mount();
    let finish!: (response: Response) => void;
    let signal: AbortSignal | undefined;
    vi.mocked(fetch).mockImplementation((_url, init) => {
      signal = init?.signal ?? undefined;
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    const loading = pet.setTheme('https://example.com/theme.json');
    pet.destroy();
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    finish({ ok: true, json: async () => ({}) } as Response);
    await expect(loading).resolves.toBeUndefined();
    expect(document.querySelector('.codex-clawd-pet')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('destroying one instance leaves another functional; repeated mount/destroy does not accumulate', async () => {
    const first = await mount();
    const second = await mount();
    first.destroy();
    fireEvent.click(petButton(second));
    expect(second.state).toBe('happy');
    second.destroy();
    for (let i = 0; i < 12; i++) {
      const pet = await mount();
      pet.destroy();
      expect(document.querySelectorAll('.codex-clawd-pet')).toHaveLength(0);
      expect(vi.getTimerCount()).toBe(0);
    }
  });
  it('destroy is safe before mounting and public mutators cannot resurrect the instance', async () => {
    const pet = new CodexClawdPet();
    pet.destroy();
    pet.destroy();
    pet.play('working');
    pet.say('NO');
    pet.setMinimized(true);
    pet.setTipsEnabled(false);
    pet.setDarkMode('dark');
    pet.notifyRouteChange();
    await pet.setTheme('https://example.com/no.json');
    expect(await pet.fetchQuote()).toBe(false);
    expect(pet.element).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});
