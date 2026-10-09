import type {
  CodexClawdPetOptions,
  PetState,
  PetThemeConfig,
  PetThemeSource,
  ResolvedPetOptions,
} from './types.js';
import { capybaraTheme, resolveOptions } from './defaults.js';
import { loadTheme } from './theme.js';
import { PetRenderer } from './PetRenderer.js';
import { PetStateMachine } from './PetStateMachine.js';
import { PetWidgetUI } from './PetWidgetUI.js';

export class CodexClawdPet {
  readonly options: ResolvedPetOptions;
  private ui?: PetWidgetUI;
  private renderer?: PetRenderer;
  private readonly machine: PetStateMachine;
  private events?: AbortController;
  private themeRequest?: AbortController;
  private quoteRequest?: AbortController;
  private observer?: MutationObserver;
  private quoteTimer?: ReturnType<typeof setInterval>;
  private scrollFrame = 0;
  private seen = new Set<number>();
  private theme?: PetThemeConfig;
  private themeIndex = 0;
  private disposed = false;
  private dark?: boolean;
  private copyTime = -10000;
  private media?: MediaQueryList;

  constructor(options: CodexClawdPetOptions = {}) {
    this.options = resolveOptions(options);
    this.machine = new PetStateMachine((state) => {
      this.renderer?.play(state);
      this.refreshPaused();
      this.options.onStateChange?.(state);
    });
  }
  get state(): PetState {
    return this.machine.state;
  }
  get currentTheme(): PetThemeConfig | undefined {
    return this.theme;
  }
  get element(): HTMLElement | undefined {
    return this.ui?.host;
  }

  async mount(target?: HTMLElement): Promise<this> {
    if (typeof document === 'undefined') throw new Error('Mount CodexClawdPet only in the browser');
    if (this.disposed) throw new Error('A destroyed pet cannot be mounted again');
    if (this.ui) return this;
    this.ui = new PetWidgetUI(
      this.options,
      {
        poke: () => {
          this.play('happy');
          this.say(this.pick(this.options.tips.poke));
        },
        drag: (direction) => {
          const directional = `drag-${direction}`;
          const state = this.theme?.actions[directional] ? directional : 'drag';
          if (this.state !== state) this.play(state, 0);
        },
        release: () => this.machine.reset(),
        switchTheme: () => {
          void this.nextTheme().catch((error) => this.report(error));
        },
        toggleTips: (enabled) => {
          this.options.tips.enabled = enabled;
          if (!enabled) this.quoteRequest?.abort();
        },
        minimize: () => this.refreshPaused(),
      },
      target ?? document.body,
    );
    this.renderer = new PetRenderer(this.ui.petButton, (error) => this.report(error));
    this.bindPage();
    try {
      try {
        await this.setTheme(this.options.theme);
      } catch (error) {
        if (this.disposed) return this;
        this.report(error);
        // Keep strict parsing and explicit setTheme errors, but never blank the initial widget.
        await this.setTheme({ ...capybaraTheme, actions: { idle: { frames: [0] } } });
      }
      if (this.disposed) return this;
      this.say(this.pick(this.options.tips.welcome));
      // Do not immediately replace the welcome bubble with the 0% message.
      this.seen.add(0);
      this.startQuotes();
      return this;
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  async setTheme(source: PetThemeSource): Promise<void> {
    if (this.disposed) return;
    this.themeRequest?.abort();
    const request = new AbortController();
    this.themeRequest = request;
    try {
      const theme = await loadTheme(source, request.signal);
      if (this.disposed || request.signal.aborted) return;
      this.theme = theme;
      const index = this.options.themes.indexOf(source);
      if (index >= 0) this.themeIndex = index;
      this.ui?.setTheme(theme);
      this.renderer?.setTheme(theme);
      this.machine.setActions(theme.actions);
      this.applyDark(true);
    } catch (error) {
      if (!request.signal.aborted) throw error;
    }
  }
  async nextTheme(): Promise<void> {
    const index = (this.themeIndex + 1) % this.options.themes.length;
    await this.setTheme(this.options.themes[index]!);
    if (!this.disposed) this.say(`换好啦，我是${this.theme?.name ?? '你的新伙伴'}。`);
  }
  play(state: PetState, duration?: number): boolean {
    return this.machine.play(state, duration);
  }
  say(message: string, duration = this.options.tips.duration): void {
    if (!this.disposed && Number.isFinite(duration) && duration > 0)
      this.ui?.showTip(message, duration);
  }
  setMinimized(value: boolean): void {
    this.ui?.setMinimized(value);
  }
  setTipsEnabled(value: boolean): void {
    this.ui?.setTipsEnabled(value);
  }
  setDarkMode(mode: 'auto' | 'light' | 'dark'): void {
    this.options.darkMode = mode;
    this.applyDark();
  }

  /** Called by VuePress after navigation; standalone consumers can also call it. */
  notifyRouteChange(): void {
    if (this.disposed) return;
    this.seen.clear();
    this.seen.add(0);
    this.machine.reset();
    if (this.options.tips.reading !== false) this.say(this.options.tips.reading[0] ?? '');
    this.queueReading();
  }
  private pick(value: string | string[]): string {
    return typeof value === 'string'
      ? value
      : (value[Math.floor(Math.random() * value.length)] ?? '');
  }
  private report(value: unknown): void {
    if (this.disposed) return;
    const error = value instanceof Error ? value : new Error(String(value));
    if (this.options.onError) this.options.onError(error);
    else console.warn('[codex-clawd-pet]', error.message);
  }

  private bindPage(): void {
    this.events = new AbortController();
    const signal = this.events.signal;
    this.media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const update = () => this.applyDark();
    this.media?.addEventListener('change', update, { signal });
    this.observer = new MutationObserver(update);
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-color-mode'],
    });
    window.addEventListener('scroll', () => this.queueReading(), { passive: true, signal });
    window.addEventListener('resize', () => this.queueReading(), { passive: true, signal });
    document.addEventListener('visibilitychange', () => this.refreshPaused(), { signal });
    document.addEventListener(
      'copy',
      (event) => {
        const selection = document.getSelection();
        const anchor = selection?.anchorNode;
        const element = anchor instanceof Element ? anchor : anchor?.parentElement;
        if (
          element?.closest('pre,code') ||
          (event.target instanceof Element && event.target.closest('pre,code'))
        )
          this.cheerCopy();
      },
      { signal },
    );
    // Clipboard API copy buttons do not emit the native `copy` event.
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest('.copy-code-button,.vp-copy-code-button,[data-copy-code]'))
          this.cheerCopy();
      },
      { signal },
    );
    this.applyDark();
  }
  private cheerCopy(): void {
    if (this.options.tips.copy === false || performance.now() - this.copyTime < 600) return;
    this.copyTime = performance.now();
    this.play('happy');
    this.say(this.options.tips.copy);
  }
  private queueReading(): void {
    if (this.scrollFrame || this.disposed) return;
    this.scrollFrame = requestAnimationFrame(() => {
      this.scrollFrame = 0;
      this.updateReading();
    });
  }
  private updateReading(): void {
    const messages = this.options.tips.reading;
    if (messages === false) return;
    const root = document.scrollingElement ?? document.documentElement;
    const range = root.scrollHeight - window.innerHeight;
    // A non-scrollable page has no meaningful reading progress.
    if (range <= 1) return;
    const progress = Math.min(100, Math.max(0, ((window.scrollY || root.scrollTop) / range) * 100));
    let message = '';
    for (const threshold of [0, 50, 100] as const) {
      if (progress + 0.5 >= threshold && !this.seen.has(threshold)) {
        this.seen.add(threshold);
        message = messages[threshold] ?? message;
        if (threshold === 100) this.play('happy');
      }
    }
    if (message) this.say(message);
  }
  private applyDark(force = false): void {
    if (this.disposed) return;
    const root = typeof document === 'undefined' ? undefined : document.documentElement;
    const explicit = root?.dataset.theme ?? root?.dataset.colorMode;
    const auto =
      explicit === 'light'
        ? false
        : explicit === 'dark' || root?.classList.contains('dark') || (this.media?.matches ?? false);
    const dark = this.options.darkMode === 'auto' ? !!auto : this.options.darkMode === 'dark';
    if (!force && dark === this.dark) return;
    this.dark = dark;
    this.ui?.setDark(dark, this.options.darkBehavior === 'dim');
    this.machine.setResting(dark && this.options.darkBehavior === 'sleep' ? 'sleeping' : 'idle');
  }
  private refreshPaused(): void {
    const paused =
      this.disposed || (typeof document !== 'undefined' && document.hidden) || !!this.ui?.minimized;
    this.renderer?.setPaused(paused);
    if (this.ui) this.ui.host.dataset.paused = String(paused);
  }
  private startQuotes(): void {
    const config = this.options.tips.hitokoto;
    if (!config) return;
    const options = typeof config === 'object' ? config : {};
    const interval = Number.isFinite(options.interval) ? Math.max(10000, options.interval!) : 60000;
    this.quoteTimer = setInterval(() => {
      void this.fetchQuote();
    }, interval);
  }
  /** Returns false on offline/invalid responses; never removes a working local tip. */
  async fetchQuote(): Promise<boolean> {
    const config = this.options.tips.hitokoto;
    if (
      !config ||
      this.disposed ||
      !this.options.tips.enabled ||
      this.ui?.minimized ||
      document.hidden ||
      this.quoteRequest
    )
      return false;
    const options = typeof config === 'object' ? config : {};
    const controller = new AbortController();
    this.quoteRequest = controller;
    const timeout = Number.isFinite(options.timeout) ? Math.max(100, options.timeout!) : 5000;
    const timer = setTimeout(() => controller.abort(), timeout);
    const clearTimer = () => clearTimeout(timer);
    controller.signal.addEventListener('abort', clearTimer, { once: true });
    try {
      const endpoint = new URL(options.endpoint ?? 'https://v1.hitokoto.cn/');
      if (!['http:', 'https:'].includes(endpoint.protocol))
        throw new Error('Hitokoto requires HTTP(S)');
      const response = await fetch(endpoint.href, {
        signal: controller.signal,
        credentials: 'omit',
      });
      if (!response.ok) throw new Error(`Hitokoto request failed: ${response.status}`);
      const data: unknown = await response.json();
      if (
        typeof data !== 'object' ||
        !data ||
        !('hitokoto' in data) ||
        typeof data.hitokoto !== 'string'
      )
        throw new Error('Invalid Hitokoto response');
      if (controller.signal.aborted || this.disposed) return false;
      this.say(data.hitokoto.slice(0, 240));
      return true;
    } catch (error) {
      if (!controller.signal.aborted) this.report(error);
      return false;
    } finally {
      clearTimeout(timer);
      controller.signal.removeEventListener('abort', clearTimer);
      if (this.quoteRequest === controller) this.quoteRequest = undefined;
    }
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.themeRequest?.abort();
    this.quoteRequest?.abort();
    this.events?.abort();
    this.observer?.disconnect();
    clearInterval(this.quoteTimer);
    if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
    this.machine.destroy();
    this.renderer?.destroy();
    this.ui?.destroy();
    this.renderer = undefined;
    this.ui = undefined;
  }
}
