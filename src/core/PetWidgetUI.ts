import type { PetThemeConfig, ResolvedPetOptions } from './types.js';
import { widgetStyles } from './styles.js';

interface Callbacks {
  poke: () => void;
  drag: (direction: 'left' | 'right') => void;
  release: () => void;
  switchTheme: () => void;
  toggleTips: (enabled: boolean) => void;
  minimize: (value: boolean) => void;
}
interface Drag {
  id: number;
  x: number;
  y: number;
  originX: number;
  originY: number;
  lastX: number;
  moved: boolean;
}
const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), Math.max(min, max));

export class PetWidgetUI {
  readonly host: HTMLDivElement;
  readonly petButton: HTMLButtonElement;
  readonly shadow: ShadowRoot;
  private readonly bubble: HTMLDivElement;
  private readonly toolbar: HTMLDivElement;
  private readonly restore: HTMLButtonElement;
  private readonly tipsButton: HTMLButtonElement;
  private readonly events = new AbortController();
  private tipTimer?: ReturnType<typeof setTimeout>;
  private drag?: Drag;
  private x = 0;
  private y = 0;
  private width = 160;
  private height = 210;
  private aspect = 208 / 192;
  private side: 'bottom-left' | 'bottom-right';
  private docked = true;
  private lastDrag = -1000;
  private tipsEnabled: boolean;
  minimized = false;

  constructor(
    private readonly options: ResolvedPetOptions,
    private readonly callbacks: Callbacks,
    target: HTMLElement,
  ) {
    this.side = options.position;
    this.tipsEnabled = options.tips.enabled;
    this.host = document.createElement('div');
    this.host.className = 'codex-clawd-pet';
    this.host.style.zIndex = String(options.zIndex);
    this.host.setAttribute('role', 'complementary');
    this.host.setAttribute('aria-label', '桌宠挂件');
    this.shadow = this.host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = widgetStyles;
    const panel = document.createElement('div');
    panel.className = 'panel';
    this.petButton = document.createElement('button');
    this.petButton.type = 'button';
    this.petButton.className = 'pet';
    this.petButton.setAttribute('aria-label', '戳一戳桌宠；可使用鼠标或触屏拖动');
    this.bubble = document.createElement('div');
    this.bubble.className = 'bubble';
    this.bubble.setAttribute('role', 'status');
    this.bubble.setAttribute('aria-live', 'polite');
    this.bubble.hidden = true;
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'toolbar';
    this.toolbar.setAttribute('role', 'group');
    this.toolbar.setAttribute('aria-label', '桌宠工具');
    this.toolbar.hidden = !options.toolbar;
    const swap = this.tool(
      '换一只桌宠',
      'M3 6h12l-3-3m3 3-3 3M15 12H3l3 3m-3-3 3-3',
      callbacks.switchTheme,
    );
    this.tipsButton = this.tool('开关对话气泡', 'M3 3h12v9H8l-4 3v-3H3z', () =>
      this.setTipsEnabled(!this.tipsEnabled),
    );
    this.tipsButton.setAttribute('aria-pressed', String(this.tipsEnabled));
    const top = this.tool('返回顶部', 'M4 8l5-5 5 5M9 3v12', () =>
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      }),
    );
    const minimize = this.tool('收起桌宠', 'M4 9h10', () => this.setMinimized(true));
    this.toolbar.append(swap, this.tipsButton, top, minimize);
    this.restore = document.createElement('button');
    this.restore.className = 'restore';
    this.restore.type = 'button';
    this.restore.textContent = '🍊';
    this.restore.setAttribute('aria-label', '展开桌宠');
    this.restore.hidden = true;
    this.restore.addEventListener('click', () => this.setMinimized(false), {
      signal: this.events.signal,
    });
    panel.append(this.bubble, this.petButton, this.toolbar, this.restore);
    this.shadow.append(style, panel);
    target.append(this.host);
    this.bindDrag();
    this.petButton.addEventListener(
      'click',
      (event) => {
        if (event.detail !== 0 && performance.now() - this.lastDrag < 350) return;
        callbacks.poke();
      },
      { signal: this.events.signal },
    );
    window.addEventListener('resize', () => this.resize(), { signal: this.events.signal });
    this.resize();
  }

  private tool(label: string, path: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tool';
    button.title = label;
    button.setAttribute('aria-label', label);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 18 18');
    svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(svg.namespaceURI, 'path');
    p.setAttribute('d', path);
    svg.append(p);
    button.append(svg);
    button.addEventListener('click', action, { signal: this.events.signal });
    return button;
  }

  setTheme(theme: PetThemeConfig): void {
    const vb = theme.viewBox;
    this.aspect = vb ? vb[3] / vb[2] : theme.frameHeight / theme.frameWidth;
    this.petButton.setAttribute('aria-label', `戳一戳${theme.name}；可使用鼠标或触屏拖动`);
    this.resize();
  }
  setDark(dark: boolean, dim: boolean): void {
    this.host.dataset.dark = String(dark);
    this.host.dataset.dim = String(dark && dim);
  }
  setTipsEnabled(enabled: boolean): void {
    this.tipsEnabled = enabled;
    this.tipsButton.setAttribute('aria-pressed', String(enabled));
    if (!enabled) this.hideTip();
    this.callbacks.toggleTips(enabled);
  }
  setMinimized(value: boolean): void {
    if (value === this.minimized) return;
    this.minimized = value;
    this.petButton.hidden = value;
    this.toolbar.hidden = value || !this.options.toolbar;
    this.restore.hidden = !value;
    this.hideTip();
    this.resize();
    this.callbacks.minimize(value);
    (value ? this.restore : this.petButton).focus({ preventScroll: true });
  }
  showTip(message: string, duration: number): void {
    if (!this.tipsEnabled || this.minimized || !message) return;
    clearTimeout(this.tipTimer);
    this.bubble.textContent = message;
    this.bubble.hidden = false;
    this.placeBubble();
    this.tipTimer = setTimeout(() => this.hideTip(), duration);
  }
  hideTip(): void {
    clearTimeout(this.tipTimer);
    this.bubble.hidden = true;
  }

  private resize(): void {
    const toolbarHeight = this.options.toolbar ? 36 : 0;
    const available = Math.max(1, window.innerHeight - toolbarHeight - 16);
    const petWidth = Math.max(
      1,
      Math.min(this.options.size, window.innerWidth - 16, available / this.aspect),
    );
    this.width = this.minimized
      ? 44
      : Math.min(Math.max(petWidth, this.options.toolbar ? 130 : 1), window.innerWidth);
    this.height = this.minimized ? 44 : petWidth * this.aspect + toolbarHeight;
    this.host.style.width = `${this.width}px`;
    this.petButton.style.height = `${petWidth * this.aspect}px`;
    if (this.docked) this.dock(false);
    else this.place(this.x, this.y, false);
  }
  private place(x: number, y: number, animate: boolean): void {
    this.x = clamp(x, 0, window.innerWidth - this.width);
    this.y = clamp(y, 0, window.innerHeight - this.height);
    this.host.style.transition =
      animate && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? 'transform 420ms cubic-bezier(.2,.85,.3,1)'
        : 'none';
    this.host.style.transform = `translate3d(${this.x}px,${this.y}px,0)`;
    this.placeBubble();
  }
  private placeBubble(): void {
    const width = this.bubble.offsetWidth || Math.min(248, window.innerWidth - 16);
    this.bubble.style.left = `${clamp(this.x + (this.width - width) / 2, 8, window.innerWidth - width - 8) - this.x}px`;
    const below = this.y < (this.bubble.offsetHeight || 90) + 8;
    this.bubble.style.top = below ? '100%' : 'auto';
    this.bubble.style.bottom = below ? 'auto' : '100%';
  }
  private dock(animate: boolean): void {
    this.docked = true;
    this.place(
      this.side === 'bottom-right'
        ? window.innerWidth - this.width - this.options.offset.x
        : this.options.offset.x,
      window.innerHeight - this.height - this.options.offset.y,
      animate,
    );
  }
  private bindDrag(): void {
    const signal = this.events.signal;
    this.petButton.addEventListener(
      'pointerdown',
      (event) => {
        if (!this.options.draggable || event.button !== 0 || this.drag || event.isPrimary === false)
          return;
        // Freeze an in-flight docking transition at its actual visual position.
        const rect = this.host.getBoundingClientRect();
        this.place(rect.x, rect.y, false);
        this.drag = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          originX: this.x,
          originY: this.y,
          lastX: event.clientX,
          moved: false,
        };
        this.petButton.setPointerCapture?.(event.pointerId);
      },
      { signal },
    );
    this.petButton.addEventListener(
      'pointermove',
      (event) => {
        const drag = this.drag;
        if (!drag || event.pointerId !== drag.id) return;
        const dx = event.clientX - drag.x,
          dy = event.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 4) return;
        event.preventDefault();
        drag.moved = true;
        this.docked = false;
        this.hideTip();
        this.callbacks.drag(event.clientX < drag.lastX ? 'left' : 'right');
        drag.lastX = event.clientX;
        this.place(drag.originX + dx, drag.originY + dy, false);
      },
      { signal },
    );
    const finish = (event: PointerEvent) => {
      const drag = this.drag;
      if (!drag || event.pointerId !== drag.id) return;
      this.drag = undefined;
      if (this.petButton.hasPointerCapture?.(event.pointerId))
        this.petButton.releasePointerCapture(event.pointerId);
      if (!drag.moved) return;
      this.lastDrag = performance.now();
      if (this.options.dock) {
        this.side =
          this.x + this.width / 2 < window.innerWidth / 2 ? 'bottom-left' : 'bottom-right';
        this.dock(true);
      }
      this.callbacks.release();
    };
    this.petButton.addEventListener('pointerup', finish, { signal });
    this.petButton.addEventListener('pointercancel', finish, { signal });
    this.petButton.addEventListener('lostpointercapture', finish, { signal });
  }
  destroy(): void {
    this.events.abort();
    clearTimeout(this.tipTimer);
    this.host.remove();
  }
}
