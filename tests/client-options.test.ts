import { expect, it } from 'vitest';
import { publicTheme } from '../src/client/options.js';
import type { ClawdThemeManifest } from '../src/core/types.js';
it('preserves external and relative URLs while prefixing root manifests', () => {
  const base = (path: string) => '/docs' + path;
  expect(publicTheme('/pets/pet.json', base)).toBe('/docs/pets/pet.json');
  expect(publicTheme('https://example.com/pet.json', base)).toBe('https://example.com/pet.json');
  expect(publicTheme('//example.com/pet.json', base)).toBe('//example.com/pet.json');
  expect(publicTheme('./pet.json', base)).toBe('./pet.json');
});
it('handles Clawd inline states and directional reaction assets without mutation', () => {
  const input: ClawdThemeManifest = {
    schemaVersion: 1,
    name: 'Test',
    viewBox: { x: 0, y: 0, width: 45, height: 45 },
    states: { idle: ['/pets/idle.svg'], error: { fallbackTo: 'idle' } },
    reactions: { drag: { fileLeft: '/pets/left.svg' } },
  };
  const output = publicTheme(input, (path) => '/docs' + path) as ClawdThemeManifest;
  expect(output.states.idle).toEqual(['/docs/pets/idle.svg']);
  expect(output.states.error).toEqual({ fallbackTo: 'idle' });
  expect(output.reactions?.drag?.fileLeft).toBe('/docs/pets/left.svg');
  expect(input.states.idle).toEqual(['/pets/idle.svg']);
});

it('prefixes inline atlas and Codex resource URLs without losing action metadata', () => {
  const base = (path: string) => '/docs' + path;
  const atlas = {
    id: 'a',
    name: 'A',
    frameWidth: 192,
    frameHeight: 208,
    columns: 1,
    rows: 1,
    spritesheet: '/pets/sheet.webp',
    actions: {
      idle: { frames: [0], priority: 10, interruptible: false },
      attention: { frames: [], source: '/pets/attention.svg' },
    },
  };
  expect(publicTheme(atlas, base)).toMatchObject({
    spritesheet: '/docs/pets/sheet.webp',
    actions: {
      idle: { priority: 10, interruptible: false },
      attention: { source: '/docs/pets/attention.svg' },
    },
  });
  expect(publicTheme({ ...atlas, spritesheet: undefined }, base)).toMatchObject({
    spritesheet: undefined,
  });
  expect(
    publicTheme({ id: 'c', displayName: 'C', spritesheetPath: '/pets/sheet.webp' }, base),
  ).toMatchObject({ spritesheetPath: '/docs/pets/sheet.webp' });
  expect(publicTheme({ id: 'c', displayName: 'C' }, base)).toMatchObject({
    spritesheetPath: undefined,
  });
});
it('prefixes every Clawd reaction variant and preserves metadata and fallback-only states', () => {
  const input: ClawdThemeManifest = {
    schemaVersion: 1,
    name: 'C',
    viewBox: { x: 0, y: 0, width: 45, height: 45 },
    states: { idle: ['/idle.svg'], attention: { files: ['/attention.svg'] }, _note: ['unchanged'] },
    reactions: {
      drag: {
        file: '/drag.svg',
        files: ['/alt.svg'],
        fileLeft: '/left.svg',
        fileRight: '/right.svg',
      },
    },
  };
  const result = publicTheme(input, (path) => '/docs' + path) as ClawdThemeManifest;
  expect(result.states._note).toEqual(['unchanged']);
  expect(result.states.attention).toEqual({ files: ['/docs/attention.svg'] });
  expect(result.reactions?.drag).toEqual({
    file: '/docs/drag.svg',
    files: ['/docs/alt.svg'],
    fileLeft: '/docs/left.svg',
    fileRight: '/docs/right.svg',
  });
  expect(publicTheme({ ...input, reactions: undefined }, (p) => p)).toMatchObject({
    reactions: undefined,
  });
});
