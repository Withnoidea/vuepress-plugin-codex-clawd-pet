import { describe, expect, it, vi } from 'vitest';
import { normalizeTheme, loadTheme, assetUrl } from '../src/core/theme.js';
import { capybaraTheme } from '../src/core/defaults.js';

const atlas = () => ({ ...capybaraTheme, spritesheet: './sheet.webp' });
const clawd = () => ({
  schemaVersion: 1,
  name: 'Clawd',
  viewBox: { x: -15, y: -25, width: 45, height: 45 },
  states: {
    idle: ['idle.svg'],
    attention: { files: ['happy.webp'] },
    error: { fallbackTo: 'attention' },
  },
  reactions: { drag: { file: 'drag.svg', fileLeft: 'left.svg', fileRight: 'right.svg' } },
});

describe('theme normalization', () => {
  it('resolves assets relative to the manifest, without mutating the caller', () => {
    const input = atlas();
    const result = normalizeTheme(input, 'https://example.com/docs/pets/theme.json');
    expect(result.spritesheet).toBe('https://example.com/docs/pets/sheet.webp');
    expect(input.spritesheet).toBe('./sheet.webp');
    expect(result.actions.idle).not.toBe(input.actions.idle);
  });
  it.each([1, 2])('adapts Codex sprite version %i, timing, directions and sleep', (version) => {
    const result = normalizeTheme(
      { id: 'pet', displayName: 'Pet', spriteVersionNumber: version },
      'https://example.com/pet.json',
    );
    expect(result.rows).toBe(version === 1 ? 9 : 11);
    expect(result.frameWidth).toBe(192);
    expect(result.frameHeight).toBe(208);
    expect(result.actions.idle.frames).toEqual([0, 1, 2, 3, 4, 5]);
    expect(result.actions.idle.frameDurations).toEqual([280, 110, 110, 140, 140, 320]);
    expect(result.actions.thinking?.frames[0]).toBe(64);
    expect(result.actions['drag-left']?.frames[0]).toBe(16);
    expect(result.actions.sleeping?.frames).toEqual([0]);
  });
  it('rejects unsupported Codex versions', () =>
    expect(() => normalizeTheme({ id: 'x', displayName: 'X', spriteVersionNumber: 3 })).toThrow(
      'spriteVersionNumber',
    ));
  it('adapts Clawd alternatives, negative viewBox, fallbacks and directional reactions', () => {
    const result = normalizeTheme(clawd(), 'https://example.com/pets/theme.json');
    expect(result.viewBox).toEqual([-15, -25, 45, 45]);
    expect(result.actions.error?.source).toBe('https://example.com/pets/happy.webp');
    expect(result.actions['drag-left']?.source).toBe('https://example.com/pets/left.svg');
    expect(result.actions.idle.frames).toEqual([]);
  });
  it('detects missing fallbacks and cycles', () => {
    const input = clawd();
    input.states.error.fallbackTo = 'missing';
    expect(() => normalizeTheme(input)).toThrow('Missing Clawd state');
    input.states.error.fallbackTo = 'error';
    expect(() => normalizeTheme(input)).toThrow('Cyclic');
  });
  it('supports row/count shorthand and string viewBox', () => {
    const result = normalizeTheme({
      ...atlas(),
      viewBox: '0 0 192 208',
      actions: { idle: { row: 1, start: 2, count: 3 } },
    });
    expect(result.actions.idle.frames).toEqual([8, 9, 10]);
  });
  it.each([-1, 42, 0.5, Infinity])('rejects invalid frame index %s', (frame) => {
    expect(() => normalizeTheme({ ...atlas(), actions: { idle: { frames: [frame] } } })).toThrow(
      'frames',
    );
  });
  it.each([0, -1, NaN])('rejects invalid frame width %s', (frameWidth) =>
    expect(() => normalizeTheme({ ...atlas(), frameWidth })).toThrow('frameWidth'),
  );
  it('rejects invalid times, empty idle, and missing idle', () => {
    expect(() =>
      normalizeTheme({ ...atlas(), actions: { idle: { frames: [0], frameDurations: [0] } } }),
    ).toThrow('frameDurations');
    expect(() => normalizeTheme({ ...atlas(), actions: { idle: { frames: [] } } })).toThrow(
      'frames',
    );
    expect(() => normalizeTheme({ ...atlas(), actions: {} })).toThrow('idle');
  });
  it.each(['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,hi'])(
    'rejects unsafe URL %s',
    (url) => expect(() => assetUrl(url)).toThrow('protocol'),
  );
  it('loads and resolves the final redirected manifest URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        url: 'https://cdn.example/pet/theme.json',
        json: async () => atlas(),
      }),
    );
    expect((await loadTheme('https://example.com/theme.json')).spritesheet).toBe(
      'https://cdn.example/pet/sheet.webp',
    );
    vi.unstubAllGlobals();
  });
  it('reports failed fetches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(loadTheme('https://example.com/theme.json')).rejects.toThrow('404');
    vi.unstubAllGlobals();
  });
});
