import { afterEach, describe, expect, it, vi } from 'vitest';
import { PetStateMachine } from '../src/core/PetStateMachine.js';
import { frameKeyframes, PetRenderer } from '../src/core/PetRenderer.js';
import { normalizeTheme } from '../src/core/theme.js';
import { capybaraTheme } from '../src/core/defaults.js';

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});
describe('state machine', () => {
  const setup = () => {
    vi.useFakeTimers();
    const changed = vi.fn();
    const machine = new PetStateMachine(changed);
    machine.setActions(normalizeTheme(capybaraTheme).actions);
    return { machine, changed };
  };
  it('holds idle and auto-returns temporary states', () => {
    const { machine } = setup();
    machine.play('working', 500);
    expect(machine.state).toBe('working');
    vi.advanceTimersByTime(500);
    expect(machine.state).toBe('idle');
    machine.destroy();
  });
  it('new actions cancel older timers', () => {
    const { machine } = setup();
    machine.play('working', 500);
    vi.advanceTimersByTime(400);
    machine.play('thinking', 1000);
    vi.advanceTimersByTime(200);
    expect(machine.state).toBe('thinking');
    vi.advanceTimersByTime(800);
    expect(machine.state).toBe('idle');
    machine.destroy();
  });
  it('held drag is never reset by a pending timer', () => {
    const { machine } = setup();
    machine.play('happy', 300);
    machine.play('drag', 0);
    vi.advanceTimersByTime(10000);
    expect(machine.state).toBe('drag');
    machine.reset();
    expect(machine.state).toBe('idle');
    machine.destroy();
  });
  it('returns to sleeping at night, safely falls back for unknown/prototype states', () => {
    const { machine } = setup();
    machine.setResting('sleeping');
    machine.play('happy', 50);
    vi.advanceTimersByTime(50);
    expect(machine.state).toBe('sleeping');
    machine.play('toString');
    expect(machine.state).toBe('idle');
    machine.destroy();
  });
  it('cleans timers and cannot revive after destruction', () => {
    const { machine, changed } = setup();
    machine.play('happy', 50);
    machine.destroy();
    changed.mockClear();
    vi.advanceTimersByTime(100);
    machine.play('working');
    expect(changed).not.toHaveBeenCalled();
  });
  it('uses non-looping frame duration instead of a fixed timeout', () => {
    const { machine } = setup();
    machine.setActions({
      idle: { frames: [0] },
      happy: { frames: [1, 2], frameDurations: [100, 200], loop: false },
    });
    machine.play('happy');
    vi.advanceTimersByTime(299);
    expect(machine.state).toBe('happy');
    vi.advanceTimersByTime(1);
    expect(machine.state).toBe('idle');
    machine.destroy();
  });
});
describe('SVG/CSS renderer', () => {
  it('handles cross-row slices and unequal times without a blank final frame', () => {
    const theme = normalizeTheme(capybaraTheme);
    const result = frameKeyframes(theme, { frames: [5, 6], frameDurations: [100, 300] });
    expect(result.duration).toBe(400);
    expect(result.css).toContain('0.000000%{transform:translate(-960px,0px)}');
    expect(result.css).toContain('25.000000%{transform:translate(0px,-208px)}');
    expect(result.css).toContain('100%{transform:translate(-960px,0px)}');
  });
  it('freezes on the last non-looping frame', () => {
    expect(
      frameKeyframes(normalizeTheme(capybaraTheme), { frames: [0, 1], loop: false }).css,
    ).toContain('100%{transform:translate(-192px,0px)}');
  });
  it('renders viewBox, CSS step-end, independent IDs and fallback', () => {
    const first = new PetRenderer(document.body),
      second = new PetRenderer(document.body);
    first.setTheme(normalizeTheme(capybaraTheme));
    second.setTheme(normalizeTheme(capybaraTheme));
    first.play('unknown');
    expect(first.element.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 192 208');
    expect(first.element.querySelector('image')?.style.animation).toContain('step-end');
    expect(first.element.querySelector('style')?.textContent).not.toBe(
      second.element.querySelector('style')?.textContent,
    );
    first.setPaused(true);
    expect(first.element.querySelector('image')?.style.animationPlayState).toBe('paused');
    first.destroy();
    second.destroy();
    expect(document.body.children).toHaveLength(0);
  });
  it('never injects external SVG into DOM', () => {
    const renderer = new PetRenderer(document.body);
    renderer.setTheme(
      normalizeTheme({
        ...capybaraTheme,
        actions: { idle: { source: 'https://example.com/idle.svg', frames: [] } },
      }),
    );
    expect(renderer.element.querySelector('img')?.src).toBe('https://example.com/idle.svg');
    expect(renderer.element.querySelector('script')).toBeNull();
    renderer.destroy();
  });
});
