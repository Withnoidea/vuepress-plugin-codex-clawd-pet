/** Known actions remain autocomplete-friendly while allowing community states. */
export type PetState =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'juggling'
  | 'sleeping'
  | 'drag'
  | 'happy'
  | 'attention'
  | (string & {});
export type PetViewBox = [x: number, y: number, width: number, height: number];

export interface PetAnimation {
  /** Row-major atlas indices. Empty only for a pre-animated source asset. */
  frames: number[];
  fps?: number;
  /** Per-frame dwell times (ms), e.g. the native Codex atlas timing. */
  frameDurations?: number[];
  loop?: boolean;
  /** State residence time, independent of the animation cycle (ms). */
  duration?: number;
  /** Scheduling priority (non-negative, default 0). */
  priority?: number;
  /** false rejects equal/lower priority transitions until completion or reset. */
  interruptible?: boolean;
  /** Clawd SVG/GIF/WebP assets are displayed as images, never injected as HTML. */
  source?: string;
}

/** Validated, renderer-independent internal theme format. */
export interface PetThemeConfig {
  id: string;
  name: string;
  spritesheet?: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  viewBox?: PetViewBox;
  fps?: number;
  pixelated?: boolean;
  actions: Record<string, PetAnimation> & { idle: PetAnimation };
}

export interface CodexPetManifest {
  id: string;
  displayName: string;
  spritesheetPath?: string;
  spriteVersionNumber?: 1 | 2;
  description?: string;
}

export interface ClawdThemeManifest {
  schemaVersion: 1;
  name: string;
  id?: string;
  viewBox: { x: number; y: number; width: number; height: number };
  states: Record<string, string[] | { files?: string[]; fallbackTo?: string }>;
  reactions?: Record<
    string,
    { file?: string; files?: string[]; fileLeft?: string; fileRight?: string; duration?: number }
  >;
}
export type PetThemeInput = PetThemeConfig | CodexPetManifest | ClawdThemeManifest;
export type PetThemeSource = PetThemeInput | string;

export interface TipsConfig {
  enabled?: boolean;
  welcome?: string | string[];
  poke?: string[];
  copy?: string | false;
  reading?: Partial<Record<0 | 50 | 100, string>> | false;
  duration?: number;
  /** Opt-in only: no requests to third parties by default. */
  hitokoto?: boolean | { endpoint?: string; interval?: number; timeout?: number };
}

export interface CodexClawdPetOptions {
  theme?: PetThemeSource;
  themes?: PetThemeSource[];
  position?: 'bottom-left' | 'bottom-right';
  /** Display width in CSS pixels; constrained to the viewport. */
  size?: number;
  offset?: { x?: number; y?: number };
  draggable?: boolean;
  /** Snap to the closest bottom corner on release. */
  dock?: boolean;
  darkMode?: 'auto' | 'light' | 'dark';
  darkBehavior?: 'sleep' | 'dim';
  tips?: TipsConfig | false;
  toolbar?: boolean;
  zIndex?: number;
  /** Browser events only; omitted from the JSON-serializable VuePress options. */
  onStateChange?: (state: PetState) => void;
  onError?: (error: Error) => void;
}
export type VuePressPetOptions = Omit<CodexClawdPetOptions, 'onStateChange' | 'onError'>;

export interface ResolvedPetOptions {
  theme: PetThemeSource;
  themes: PetThemeSource[];
  position: 'bottom-left' | 'bottom-right';
  size: number;
  offset: { x: number; y: number };
  draggable: boolean;
  dock: boolean;
  darkMode: 'auto' | 'light' | 'dark';
  darkBehavior: 'sleep' | 'dim';
  tips: Required<TipsConfig>;
  toolbar: boolean;
  zIndex: number;
  onStateChange?: (state: PetState) => void;
  onError?: (error: Error) => void;
}
