// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { codexClawdPetPlugin } from '../src/node/index.js';
import { CodexClawdPet } from '../src/core/index.js';
describe('SSR and plugin', () => {
  it('imports and constructs the core without browser globals', () => {
    const pet = new CodexClawdPet();
    expect(pet.state).toBe('idle');
    pet.destroy();
  });
  it('registers a client file and merges nested options', () => {
    const plugin = codexClawdPetPlugin({ offset: { x: 7 }, tips: false });
    expect(plugin.name).toBe('vuepress-plugin-codex-clawd-pet');
    expect(plugin.clientConfigFile).toMatch(/client[\\/]config.js$/);
    expect(plugin.clientConfigFile).not.toContain('\\');
    expect(plugin.define).toMatchObject({
      __CODEX_CLAWD_PET_OPTIONS__: { offset: { x: 7, y: 20 }, tips: false },
    });
  });
  it('rejects nonserializable configuration instead of dropping it silently', () => {
    expect(() => codexClawdPetPlugin({ theme: (() => {}) as never })).toThrow('JSON serializable');
  });
});
