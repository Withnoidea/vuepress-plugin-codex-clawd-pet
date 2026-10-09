import type { PetAnimation, PetState, PetThemeConfig } from './types.js';

const NS = 'http://www.w3.org/2000/svg';
let sequence = 0;

/** Keyframes cover arbitrary rows and unequal dwell times, never a blank terminal frame. */
export function frameKeyframes(
  theme: PetThemeConfig,
  action: PetAnimation,
): { css: string; duration: number } {
  const times =
    action.frameDurations ?? action.frames.map(() => 1000 / (action.fps ?? theme.fps ?? 8));
  const duration = times.reduce((a, b) => a + b, 0);
  const [, , w, h] = theme.viewBox ?? [0, 0, theme.frameWidth, theme.frameHeight];
  const transform = (frame: number) =>
    `transform:translate(${-((frame % theme.columns) * w)}px,${-(Math.floor(frame / theme.columns) * h)}px)`;
  let elapsed = 0;
  const css = action.frames
    .map((frame, i) => {
      const step = `${((elapsed / duration) * 100).toFixed(6)}%{${transform(frame)}}`;
      elapsed += times[i]!;
      return step;
    })
    .join('');
  const last = action.loop === false ? action.frames.at(-1)! : action.frames[0]!;
  return { css: `${css}100%{${transform(last)}}`, duration };
}

/** No RAF animation loop, canvas engine, SVG scripts or innerHTML. */
export class PetRenderer {
  readonly element: HTMLDivElement;
  private readonly style: HTMLStyleElement;
  private readonly svg: SVGSVGElement;
  private readonly image: SVGImageElement;
  private readonly standalone: HTMLImageElement;
  private readonly animationName = `ccp-frames-${++sequence}`;
  private theme?: PetThemeConfig;
  private state = '';

  constructor(container: HTMLElement, onError?: (error: Error) => void) {
    this.element = document.createElement('div');
    this.element.className = 'ccp-renderer';
    this.element.setAttribute('aria-hidden', 'true');
    this.style = document.createElement('style');
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.style.overflow = 'hidden';
    this.image = document.createElementNS(NS, 'image');
    this.image.setAttribute('preserveAspectRatio', 'none');
    this.image.style.transformBox = 'view-box';
    this.image.style.transformOrigin = '0 0';
    this.image.style.willChange = 'transform';
    this.standalone = document.createElement('img');
    this.standalone.alt = '';
    this.standalone.draggable = false;
    this.standalone.style.cssText = 'width:100%;height:100%;object-fit:contain';
    this.standalone.addEventListener('error', () =>
      onError?.(new Error('Pet state image could not be loaded')),
    );
    this.image.addEventListener('error', () =>
      onError?.(new Error('Pet spritesheet could not be loaded')),
    );
    this.svg.append(this.image);
    this.element.append(this.style, this.svg, this.standalone);
    container.append(this.element);
  }

  setTheme(theme: PetThemeConfig): void {
    this.theme = theme;
    this.state = '';
    const vb = theme.viewBox ?? [0, 0, theme.frameWidth, theme.frameHeight];
    this.svg.setAttribute('viewBox', vb.join(' '));
    this.image.setAttribute('x', String(vb[0]));
    this.image.setAttribute('y', String(vb[1]));
    this.image.setAttribute('width', String(vb[2] * theme.columns));
    this.image.setAttribute('height', String(vb[3] * theme.rows));
    if (theme.spritesheet) this.image.setAttribute('href', theme.spritesheet);
    else this.image.removeAttribute('href');
    this.element.style.imageRendering = theme.pixelated ? 'pixelated' : 'auto';
    this.play('idle');
  }

  play(requested: PetState): void {
    if (!this.theme) return;
    const state = Object.hasOwn(this.theme.actions, requested) ? requested : 'idle';
    if (state === this.state) return;
    this.state = state;
    const action = this.theme.actions[state]!;
    this.svg.style.display = action.source ? 'none' : 'block';
    this.standalone.style.display = action.source ? 'block' : 'none';
    if (action.source) {
      this.style.textContent = '';
      this.image.style.animation = 'none';
      this.standalone.src = action.source;
      return;
    }
    this.standalone.removeAttribute('src');
    const { css, duration } = frameKeyframes(this.theme, action);
    this.image.style.animation = 'none';
    this.style.textContent = `@keyframes ${this.animationName}{${css}}`;
    // A single style flush on state changes restarts animation; no per-frame JS work.
    void this.image.getBoundingClientRect();
    this.image.style.animation = `${this.animationName} ${duration}ms step-end ${action.loop === false ? '1' : 'infinite'} both`;
  }

  setPaused(paused: boolean): void {
    this.image.style.animationPlayState = paused ? 'paused' : 'running';
  }
  destroy(): void {
    this.element.remove();
  }
}
