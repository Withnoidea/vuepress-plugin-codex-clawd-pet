import type { PetAnimation, PetThemeConfig, PetThemeSource, PetViewBox } from './types.js';

type Obj = Record<string, unknown>;
const object = (value: unknown): Obj => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Theme must contain objects');
  return value as Obj;
};
const positive = (value: unknown, label: string, integer = false): number => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0 ||
    (integer && !Number.isInteger(value))
  ) {
    throw new Error(`Invalid ${label}: expected a positive ${integer ? 'integer' : 'number'}`);
  }
  return value;
};
const text = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing ${label}`);
  return value;
};

export function assetUrl(value: string, base?: string): string {
  const url = new URL(
    value,
    base ?? (typeof document === 'undefined' ? 'https://pet.invalid/' : document.baseURI),
  );
  if (
    !['https:', 'http:', 'blob:'].includes(url.protocol) &&
    !(url.protocol === 'data:' && /^data:image\/(?:png|webp|gif|jpeg|svg\+xml)[;,]/i.test(value))
  ) {
    throw new Error(`Unsupported asset protocol: ${url.protocol}`);
  }
  return url.href;
}

// Codex V1 timing mirrored by clawd-on-desk/src/codex-pet-adapter.js.
// V2 preserves these nine rows and adds two; unknown extra actions are not guessed.
const codexRows: Array<[string, number[]]> = [
  ['idle', [280, 110, 110, 140, 140, 320]],
  ['running-right', [120, 120, 120, 120, 120, 120, 120, 220]],
  ['running-left', [120, 120, 120, 120, 120, 120, 120, 220]],
  ['waving', [140, 140, 140, 280]],
  ['jumping', [140, 140, 140, 140, 280]],
  ['failed', [140, 140, 140, 140, 140, 140, 140, 240]],
  ['waiting', [150, 150, 150, 150, 150, 260]],
  ['running', [120, 120, 120, 120, 120, 220]],
  ['review', [150, 150, 150, 150, 150, 280]],
];

function codex(input: Obj): Obj {
  const version = input.spriteVersionNumber ?? 1;
  if (version !== 1 && version !== 2)
    throw new Error('Unsupported Codex spriteVersionNumber (expected 1 or 2)');
  const actions: Record<string, PetAnimation> = Object.create(null);
  codexRows.forEach(([key, times], row) => {
    actions[key] = { frames: times.map((_, i) => row * 8 + i), frameDurations: times };
  });
  for (const [alias, target] of Object.entries({
    thinking: 'review',
    working: 'running',
    juggling: 'waving',
    drag: 'running-right',
    'drag-left': 'running-left',
    'drag-right': 'running-right',
    happy: 'jumping',
    attention: 'jumping',
    error: 'failed',
    notification: 'waiting',
  }))
    actions[alias] = actions[target]!;
  actions.sleeping = { frames: [0] };
  return {
    id: input.id,
    name: input.displayName,
    spritesheet: input.spritesheetPath ?? 'spritesheet.webp',
    frameWidth: 192,
    frameHeight: 208,
    columns: 8,
    rows: version === 1 ? 9 : 11,
    actions,
  };
}

function clawd(input: Obj): Obj {
  if (input.schemaVersion !== 1) throw new Error('Unsupported Clawd schemaVersion (expected 1)');
  const vb = object(input.viewBox);
  const states = object(input.states);
  const actions: Record<string, PetAnimation> = Object.create(null);
  const resolve = (key: string, seen = new Set<string>()): PetAnimation => {
    if (seen.has(key)) throw new Error(`Cyclic Clawd fallbackTo: ${key}`);
    seen.add(key);
    if (!Object.hasOwn(states, key)) throw new Error(`Missing Clawd state: ${key}`);
    const state = states[key];
    const files = Array.isArray(state) ? state : object(state).files;
    // Clawd arrays are visual alternatives, not animation frames; choose the first.
    if (Array.isArray(files) && files.length)
      return { source: text(files[0], `states.${key}`), frames: [] };
    const fallback = object(state).fallbackTo;
    return resolve(text(fallback, `states.${key}.fallbackTo`), seen);
  };
  for (const key of Object.keys(states).filter((key) => !key.startsWith('_')))
    actions[key] = resolve(key);
  if (!actions.idle) throw new Error('Theme requires idle');
  if (actions.attention) actions.happy = actions.attention;
  if (input.reactions) {
    const reactions = object(input.reactions);
    for (const [key, alias] of [
      ['drag', 'drag'],
      ['clickLeft', 'happy'],
    ] as const) {
      if (!reactions[key]) continue;
      const reaction = object(reactions[key]);
      const source =
        reaction.file ?? (Array.isArray(reaction.files) ? reaction.files[0] : undefined);
      if (source)
        actions[alias] = {
          source: text(source, key),
          frames: [],
          duration: reaction.duration as number | undefined,
        };
      if (key === 'drag')
        for (const direction of ['Left', 'Right']) {
          if (reaction[`file${direction}`])
            actions[`drag-${direction.toLowerCase()}`] = {
              source: text(reaction[`file${direction}`], key),
              frames: [],
            };
        }
    }
  }
  return {
    id: input.id ?? input.name,
    name: input.name,
    frameWidth: vb.width,
    frameHeight: vb.height,
    columns: 1,
    rows: 1,
    viewBox: [vb.x, vb.y, vb.width, vb.height],
    actions,
  };
}

/** Also accepts common row/start/count and animations aliases for hand-authored atlases. */
export function normalizeTheme(raw: unknown, base?: string): PetThemeConfig {
  let input = object(raw);
  if ('states' in input) input = clawd(input);
  else if ('displayName' in input || 'spriteVersionNumber' in input || 'spritesheetPath' in input)
    input = codex(input);
  const width = positive(input.frameWidth, 'frameWidth');
  const height = positive(input.frameHeight, 'frameHeight');
  const columns = positive(input.columns, 'columns', true);
  const rows = positive(input.rows, 'rows', true);
  if (columns * rows > 65536) throw new Error('Atlas exceeds 65536 frames');
  let viewBox: PetViewBox = [0, 0, width, height];
  if (input.viewBox !== undefined) {
    const v =
      typeof input.viewBox === 'string'
        ? input.viewBox
            .trim()
            .split(/[\s,]+/)
            .map(Number)
        : input.viewBox;
    if (
      !Array.isArray(v) ||
      v.length !== 4 ||
      !v.every((n) => typeof n === 'number' && Number.isFinite(n))
    )
      throw new Error('Invalid viewBox');
    viewBox = [v[0], v[1], positive(v[2], 'viewBox width'), positive(v[3], 'viewBox height')];
  }
  const fps = positive(input.fps ?? 8, 'fps');
  const spritesheet =
    input.spritesheet === undefined
      ? undefined
      : assetUrl(text(input.spritesheet, 'spritesheet'), base);
  const rawActions = object(input.actions ?? input.animations);
  const actions: Record<string, PetAnimation> = Object.create(null);
  for (const [state, rawAction] of Object.entries(rawActions)) {
    const a = object(rawAction);
    let frames: unknown = a.frames;
    const source =
      a.source === undefined ? undefined : assetUrl(text(a.source, `${state}.source`), base);
    if (!Array.isArray(frames) && !source) {
      const count = positive(a.count ?? a.frames, `${state}.count`, true);
      if (count > 4096) throw new Error('Animation exceeds 4096 frames');
      const row = a.row ?? 0;
      const start = a.start ?? 0;
      if (
        !Number.isInteger(row) ||
        !Number.isInteger(start) ||
        (row as number) < 0 ||
        (start as number) < 0
      )
        throw new Error(`Invalid ${state} row/start`);
      frames = Array.from(
        { length: count },
        (_, i) => (row as number) * columns + (start as number) + i,
      );
    }
    frames ??= [];
    if (
      !Array.isArray(frames) ||
      frames.length > 4096 ||
      (!source && !frames.length) ||
      !frames.every((f) => Number.isInteger(f) && f >= 0 && f < columns * rows)
    )
      throw new Error(`Invalid or out-of-bounds frames: ${state}`);
    if (!source && !spritesheet) throw new Error(`Missing spritesheet for ${state}`);
    const times = a.frameDurations;
    if (
      times !== undefined &&
      (!Array.isArray(times) ||
        times.length !== frames.length ||
        !times.every((t) => typeof t === 'number' && Number.isFinite(t) && t > 0))
    )
      throw new Error(`Invalid frameDurations: ${state}`);
    if (
      a.priority !== undefined &&
      (typeof a.priority !== 'number' || !Number.isFinite(a.priority) || a.priority < 0)
    )
      throw new Error(`Invalid priority: ${state}`);
    if (a.interruptible !== undefined && typeof a.interruptible !== 'boolean')
      throw new Error(`Invalid interruptible: ${state}`);
    actions[state] = {
      priority: a.priority as number | undefined,
      interruptible: a.interruptible as boolean | undefined,
      frames: [...frames],
      source,
      fps: positive(a.fps ?? fps, `${state}.fps`),
      frameDurations: times === undefined ? undefined : [...(times as number[])],
      loop: a.loop !== false,
      duration: a.duration === undefined ? undefined : positive(a.duration, `${state}.duration`),
    };
  }
  if (!Object.hasOwn(actions, 'idle')) throw new Error('Theme requires idle');
  return {
    id: text(input.id, 'id'),
    name: text(input.name, 'name'),
    spritesheet,
    frameWidth: width,
    frameHeight: height,
    columns,
    rows,
    viewBox,
    fps,
    pixelated: input.pixelated === true,
    actions: actions as PetThemeConfig['actions'],
  };
}

export async function loadTheme(
  source: PetThemeSource,
  signal?: AbortSignal,
): Promise<PetThemeConfig> {
  if (typeof source !== 'string') return normalizeTheme(source);
  const url = assetUrl(source);
  if (!/^https?:/.test(url)) throw new Error('Theme manifests must use HTTP(S)');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 15000);
  const clearTimer = () => clearTimeout(timer);
  controller.signal.addEventListener('abort', clearTimer, { once: true });
  if (controller.signal.aborted) clearTimer();
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Theme request failed: ${response.status}`);
    return normalizeTheme(await response.json(), response.url || url);
  } finally {
    clearTimeout(timer);
    controller.signal.removeEventListener('abort', clearTimer);
    signal?.removeEventListener('abort', abort);
  }
}
