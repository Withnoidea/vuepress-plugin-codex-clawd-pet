import { within, fireEvent } from '@testing-library/dom';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import { CodexClawdPet } from '../src/core/CodexClawdPet.js';
import { capybaraTheme } from '../src/core/defaults.js';
import type { CodexClawdPetOptions, PetThemeConfig } from '../src/core/types.js';
import { property } from './setup.js';

export const theme: PetThemeConfig = {
  ...capybaraTheme,
  spritesheet: '/pets/spritesheet.webp',
  actions: {
    ...capybaraTheme.actions,
    juggling: { frames: [18, 19], duration: 800 },
    attention: { frames: [36, 37], duration: 500, priority: 10, interruptible: false },
  },
};
export const root = (pet: CodexClawdPet) => pet.element!.shadowRoot!;
// DOM Testing Library accepts a ShadowRoot at runtime; its public type is HTMLElement.
export const queries = (pet: CodexClawdPet) => within(root(pet) as unknown as HTMLElement);
export const bubble = (pet: CodexClawdPet) => queries(pet).getByRole('status', { hidden: true });
export const petButton = (pet: CodexClawdPet) =>
  queries(pet).getByRole('button', { name: /戳一戳/ });
export function position(host: HTMLElement): { x: number; y: number } {
  const values = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px,\s*0\)/.exec(host.style.transform);
  if (!values) throw new Error(`Missing translate3d: ${host.style.transform}`);
  return { x: Number(values[1]), y: Number(values[2]) };
}
export function size(pet: CodexClawdPet): { width: number; height: number } {
  const host = pet.element!;
  const button = root(pet).querySelector<HTMLButtonElement>('.pet')!;
  const toolbar = root(pet).querySelector<HTMLElement>('.toolbar')!;
  return {
    width: parseFloat(host.style.width),
    height: button.hidden ? 44 : parseFloat(button.style.height) + (toolbar.hidden ? 0 : 36),
  };
}
export function pointer(
  target: HTMLElement,
  type: 'down' | 'move' | 'up' | 'cancel',
  x: number,
  y: number,
  extra: PointerEventInit = {},
): void {
  fireEvent(
    target,
    new PointerEvent(`pointer${type}`, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      ...extra,
    }),
  );
}
export function scroll(y: number): void {
  property(window, 'scrollY', y);
  fireEvent.scroll(window);
  vi.advanceTimersToNextFrame();
}
export async function mutations(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
export function harness() {
  const pets: CodexClawdPet[] = [];
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    try {
      pets.splice(0).forEach((pet) => pet.destroy());
      expect(vi.getTimerCount(), 'pet-owned timers/RAF must not survive teardown').toBe(0);
    } finally {
      vi.useRealTimers();
      document.body.replaceChildren();
    }
  });
  return async (options: CodexClawdPetOptions = {}) => {
    const pet = new CodexClawdPet({ theme, ...options });
    pets.push(pet);
    await pet.mount();
    // jsdom does not lay out CSS transforms. This shim reflects styles, not expected answers.
    vi.spyOn(pet.element!, 'getBoundingClientRect').mockImplementation(() => {
      const { x, y } = position(pet.element!);
      const { width, height } = size(pet);
      return {
        x,
        y,
        width,
        height,
        left: x,
        top: y,
        right: x + width,
        bottom: y + height,
        toJSON: () => ({ x, y, width, height }),
      };
    });
    return pet;
  };
}
