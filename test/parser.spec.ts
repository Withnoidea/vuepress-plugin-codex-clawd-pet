import { describe, expect, it, vi } from 'vitest';
import { normalizeTheme, loadTheme } from '../src/core/theme.js';
import { capybaraTheme } from '../src/core/defaults.js';
import { harness, root, theme } from './support.js';

const mount = harness();
const base = 'https://cdn.example/pets/theme.json';

describe('theme.json parsing and defensive loading', () => {
  it('extracts viewBox, atlas size, cross-row frames and scheduling metadata', () => {
    const result = normalizeTheme(
      {
        ...theme,
        viewBox: '-10 -20 192 208',
        actions: {
          idle: { row: 0, count: 6 },
          juggling: { row: 2, start: 4, count: 4 },
          attention: theme.actions.attention,
        },
      },
      base,
    );
    expect(result.viewBox).toEqual([-10, -20, 192, 208]);
    expect([result.frameWidth, result.frameHeight, result.columns, result.rows]).toEqual([
      192, 208, 6, 7,
    ]);
    expect(result.actions.idle.frames).toHaveLength(6);
    expect(result.actions.juggling?.frames).toEqual([16, 17, 18, 19]);
    expect(result.actions.attention).toMatchObject({
      duration: 500,
      priority: 10,
      interruptible: false,
    });
    expect(result.spritesheet).toBe('https://cdn.example/pets/spritesheet.webp');
  });
  it('preserves Clawd object viewBox and treats file arrays as alternatives, not frames', () => {
    const result = normalizeTheme(
      {
        schemaVersion: 1,
        name: 'Clawd',
        viewBox: { x: -15, y: -25, width: 192, height: 208 },
        states: {
          idle: ['idle.svg', 'idle-2.svg'],
          thinking: { fallbackTo: 'idle' },
          attention: { files: ['attention.svg'] },
        },
        reactions: { clickLeft: { files: ['poke.svg'], duration: 600 } },
      },
      base,
    );
    expect(result.viewBox).toEqual([-15, -25, 192, 208]);
    expect(result.actions.idle.frames).toEqual([]);
    expect(result.actions.idle.source).toBe('https://cdn.example/pets/idle.svg');
    expect(result.actions.thinking).toEqual(result.actions.idle);
    expect(result.actions.happy).toMatchObject({
      source: 'https://cdn.example/pets/poke.svg',
      duration: 600,
    });
  });
  it.each([null, {}, { frameWidth: 192 }, { ...theme, actions: {} }, { ...theme, frameWidth: 0 }])(
    'keeps strict parsing diagnostic but mounts a default idle frame for invalid input %#',
    async (raw) => {
      expect(() => normalizeTheme(raw)).toThrow();
      vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => raw } as Response);
      const onError = vi.fn();
      const pet = await mount({ theme: base, onError });
      expect(onError).toHaveBeenCalledTimes(1);
      expect(pet.currentTheme).toMatchObject({
        frameWidth: 192,
        frameHeight: 208,
        actions: { idle: { frames: [0] } },
      });
      expect(pet.currentTheme?.id).toBe(capybaraTheme.id);
      expect(pet.state).toBe('idle');
      expect(pet.element?.isConnected).toBe(true);
      expect(root(pet).querySelector('image')?.getAttribute('href')).toContain('spritesheet.webp');
    },
  );
  it.each(['syntax', 'offline', '404'])(
    'initial %s failure recovers without an unhandled rejection',
    async (kind) => {
      const error = new Error(kind);
      if (kind === 'offline') vi.mocked(fetch).mockRejectedValueOnce(error);
      else
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: kind !== '404',
          status: 404,
          json: async () => {
            throw error;
          },
        } as unknown as Response);
      const onError = vi.fn();
      const pet = await mount({ theme: base, onError });
      expect(onError).toHaveBeenCalledTimes(1);
      expect(pet.state).toBe('idle');
      expect(pet.element?.isConnected).toBe(true);
    },
  );
  it('a failed explicit theme switch rejects but preserves the working theme and DOM', async () => {
    const pet = await mount();
    const previous = pet.currentTheme;
    const element = pet.element;
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
    await expect(pet.setTheme(base)).rejects.toThrow();
    expect(pet.currentTheme).toBe(previous);
    expect(pet.element).toBe(element);
  });
  it.each([
    { viewBox: [0, 0, -1, 208] },
    { viewBox: '0 0 NaN 208' },
    { columns: 0 },
    { rows: 0.5 },
    { columns: 65537 },
    { actions: { idle: { count: 4097 } } },
    { actions: { idle: { row: -1, count: 1 } } },
    { actions: { idle: { frames: [0], priority: -1 } } },
    { actions: { idle: { frames: [0], interruptible: 'no' } } },
  ])('rejects malformed geometry/scheduling without mutating source %#', (patch) => {
    const input = { ...theme, ...patch };
    const copy = JSON.stringify(input);
    expect(() => normalizeTheme(input)).toThrow();
    expect(JSON.stringify(input)).toBe(copy);
  });
  it('aborts a hung manifest at exactly 15 seconds and clears its timeout', async () => {
    vi.mocked(fetch).mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    );
    const result = loadTheme(base);
    const assertion = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
});
