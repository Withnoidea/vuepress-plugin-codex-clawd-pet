import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { harness, petButton, pointer, position, size } from './support.js';
import { property } from './setup.js';

const mount = harness();

describe('mouse-pointer drag and viewport constraints', () => {
  it('updates translate3d by mouse deltas and preserves position with dock=false', async () => {
    const pet = await mount({ dock: false, position: 'bottom-left' });
    const host = pet.element!;
    const button = petButton(pet);
    const start = position(host);
    pointer(button, 'down', 80, 600);
    pointer(button, 'move', 200, 500);
    expect(pet.state).toBe('drag');
    expect(position(host)).toEqual({ x: start.x + 120, y: start.y - 100 });
    pointer(button, 'up', 200, 500);
    expect(pet.state).toBe('idle');
    expect(position(host)).toEqual({ x: start.x + 120, y: start.y - 100 });
  });
  it.each([
    [-10000, -10000, 'min'],
    [10000, 10000, 'max'],
  ] as const)('clamps outside pointer coordinates (%i,%i) to %s bounds', async (x, y, edge) => {
    const pet = await mount({ dock: false });
    const button = petButton(pet);
    pointer(button, 'down', 900, 600);
    pointer(button, 'move', x, y);
    const { width, height } = size(pet);
    expect(position(pet.element!)).toEqual(
      edge === 'min'
        ? { x: 0, y: 0 }
        : { x: window.innerWidth - width, y: window.innerHeight - height },
    );
    pointer(button, 'up', x, y);
  });
  it('ignores sub-threshold movement, non-primary buttons and foreign pointer IDs', async () => {
    const pet = await mount({ dock: false });
    const button = petButton(pet);
    const initial = position(pet.element!);
    pointer(button, 'down', 800, 600, { button: 2 });
    pointer(button, 'move', 200, 200);
    pointer(button, 'down', 800, 600, { isPrimary: false });
    pointer(button, 'move', 200, 200);
    expect(position(pet.element!)).toEqual(initial);
    pointer(button, 'down', 800, 600);
    pointer(button, 'move', 802, 601);
    pointer(button, 'move', 200, 200, { pointerId: 2 });
    pointer(button, 'up', 200, 200, { pointerId: 2 });
    expect(pet.state).toBe('idle');
    expect(position(pet.element!)).toEqual(initial);
    pointer(button, 'up', 802, 601);
    fireEvent.click(button);
    expect(pet.state).toBe('happy');
  });
  it.each(['up', 'cancel'] as const)(
    'pointer%s releases capture and docks to the nearest bottom corner',
    async (end) => {
      const pet = await mount();
      const button = petButton(pet);
      const capture = vi.fn(),
        release = vi.fn();
      property(button, 'setPointerCapture', capture);
      property(button, 'hasPointerCapture', () => true);
      property(button, 'releasePointerCapture', release);
      pointer(button, 'down', 900, 600);
      pointer(button, 'move', -10000, 200);
      pointer(button, end, -10000, 200);
      expect(capture).toHaveBeenCalledWith(1);
      expect(release).toHaveBeenCalledWith(1);
      expect(position(pet.element!)).toEqual({
        x: 24,
        y: window.innerHeight - size(pet).height - 20,
      });
      expect(pet.element?.style.transition).toContain('420ms');
      expect(pet.state).toBe('idle');
    },
  );
  it('suppresses the synthetic mouse click after a drag, without blocking keyboard activation', async () => {
    const pet = await mount();
    const button = petButton(pet);
    pointer(button, 'down', 900, 600);
    pointer(button, 'move', 600, 400);
    pointer(button, 'up', 600, 400);
    fireEvent.click(button, { detail: 1 });
    expect(pet.state).toBe('idle');
    fireEvent.click(button, { detail: 0 });
    expect(pet.state).toBe('happy');
    vi.advanceTimersByTime(350);
    pet.play('idle');
    fireEvent.click(button, { detail: 1 });
    expect(pet.state).toBe('happy');
  });
  it('disabled dragging leaves position and state untouched', async () => {
    const pet = await mount({ draggable: false });
    const button = petButton(pet);
    const before = position(pet.element!);
    pointer(button, 'down', 900, 600);
    pointer(button, 'move', -500, -500);
    pointer(button, 'up', -500, -500);
    expect(position(pet.element!)).toEqual(before);
    expect(pet.state).toBe('idle');
  });
  it('resize re-clamps an undocked pet in a narrow, short viewport', async () => {
    const pet = await mount({ dock: false });
    const button = petButton(pet);
    pointer(button, 'down', 900, 600);
    pointer(button, 'move', 800, 500);
    pointer(button, 'up', 800, 500);
    property(window, 'innerWidth', 180);
    property(window, 'innerHeight', 240);
    fireEvent.resize(window);
    const { x, y } = position(pet.element!);
    const { width, height } = size(pet);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + width).toBeLessThanOrEqual(180);
    expect(y + height).toBeLessThanOrEqual(240);
  });
});
