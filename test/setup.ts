import { afterEach, beforeEach, vi } from 'vitest';

// Browser-only shims: never install DOM globals in the existing node/SSR suite.
const restorers: Array<() => void> = [];
export function property(target: object, key: string, value: unknown): void {
  const previous = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { configurable: true, writable: true, value });
  restorers.push(() => {
    if (previous) Object.defineProperty(target, key, previous);
    else Reflect.deleteProperty(target, key);
  });
}

beforeEach(() => {
  if (typeof window === 'undefined') return;
  document.body.replaceChildren();
  document.documentElement.className = '';
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.colorMode;
  property(window, 'innerWidth', 1024);
  property(window, 'innerHeight', 768);
  property(window, 'scrollY', 0);
  property(document, 'hidden', false);
  property(document, 'scrollingElement', document.documentElement);
  property(document.documentElement, 'scrollHeight', 1768);
  property(document.documentElement, 'scrollTop', 0);
  property(window, 'scrollTo', vi.fn());
  property(
    window,
    'matchMedia',
    vi.fn((query: string) =>
      Object.assign(new EventTarget(), {
        media: query,
        matches: false,
        onchange: null,
      }),
    ),
  );
  // jsdom has no native PointerEvent; dispatch real MouseEvent coordinates with pointer metadata.
  class MousePointerEvent extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? 'mouse';
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  vi.stubGlobal('PointerEvent', MousePointerEvent);
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('Unmocked network request'))),
  );
});

afterEach(() => {
  while (restorers.length) restorers.pop()!();
  vi.unstubAllGlobals();
});
