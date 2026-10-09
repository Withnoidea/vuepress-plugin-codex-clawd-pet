import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { luluTheme, showcaseThemes } from '../playground/themes.js';
import { capybaraTheme } from '../src/core/defaults.js';
import { frameKeyframes } from '../src/core/PetRenderer.js';

// Exercise the actual showcase configuration, not a hand-authored test fixture.
describe('Lulu Playground theme', () => {
  it('puts Lulu first in the showcase without changing the published default', () => {
    expect(showcaseThemes.map(({ theme }) => theme.id)).toEqual(['capybara-lulu', 'capybara']);
    expect(luluTheme.name).toBe('水豚噜噜');
    expect(luluTheme).toMatchObject({ frameWidth: 192, frameHeight: 208, columns: 8, rows: 9 });
    expect(luluTheme.viewBox).toEqual([0, 0, 192, 208]);
    expect(capybaraTheme.id).toBe('capybara');
  });

  it('preserves the original transparent atlas byte-for-byte and matches its geometry', async () => {
    const atlas = await readFile('playground/themes/lulu/spritesheet.webp');
    const metadata = await sharp(atlas).metadata();
    expect(metadata).toMatchObject({ format: 'webp', width: 1536, height: 1872, hasAlpha: true });
    expect(atlas.byteLength).toBe(1529066);
    expect(createHash('sha256').update(atlas).digest('hex')).toBe(
      'cc63363678c02523ac144f606b06a6db233ef102b9cea9fa38798ddaef2b5049',
    );
    expect(metadata.width).toBe(luluTheme.columns * luluTheme.frameWidth);
    expect(metadata.height).toBe(luluTheme.rows * luluTheme.frameHeight);
  });

  it('uses Codex dwell times and the correct Clawd state rows without SVG wrappers', () => {
    expect(luluTheme.spritesheet).toContain('/playground/themes/lulu/spritesheet.webp');
    expect(luluTheme.actions.idle.frameDurations).toEqual([280, 110, 110, 140, 140, 320]);
    const rows = {
      idle: 0,
      juggling: 3,
      happy: 4,
      attention: 4,
      error: 5,
      notification: 6,
      working: 7,
      sweeping: 7,
      carrying: 7,
      thinking: 8,
    };
    for (const [state, row] of Object.entries(rows)) {
      expect(luluTheme.actions[state]!.frames[0], state).toBe(row * 8);
    }
    for (const action of Object.values(luluTheme.actions)) {
      expect(action.source).toBeUndefined();
      expect(action.frames.every((frame) => frame >= 0 && frame < 72)).toBe(true);
    }
    expect(luluTheme.actions.sleeping!.frames).toEqual([0]);
  });

  it('uses separate right and left running rows instead of mirroring the costume', () => {
    expect(luluTheme.actions['drag-right']!.frames).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(luluTheme.actions['drag-left']!.frames).toEqual([16, 17, 18, 19, 20, 21, 22, 23]);
    expect(luluTheme.actions.drag).toEqual(luluTheme.actions['drag-right']);
  });

  it('keeps the original 840ms jump-once click reaction and holds its final frame', () => {
    const click = luluTheme.actions.happy!;
    expect(click).toMatchObject({ frames: [32, 33, 34, 35, 36], loop: false, duration: 840 });
    const keyframes = frameKeyframes(luluTheme, click);
    expect(keyframes.duration).toBe(840);
    expect(keyframes.css).toContain('100%{transform:translate(-768px,-832px)}');
  });
});
