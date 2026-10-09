import type { PetAnimation, PetState } from './types.js';

export class PetStateMachine {
  private timer?: ReturnType<typeof setTimeout>;
  private actions: Record<string, PetAnimation> = { idle: { frames: [0] } };
  private current: PetState = 'idle';
  private resting: PetState = 'idle';
  private disposed = false;
  constructor(private readonly onChange: (state: PetState) => void) {}
  get state(): PetState {
    return this.current;
  }

  setActions(actions: Record<string, PetAnimation>): void {
    if (this.disposed) return;
    this.actions = {
      ...actions,
      idle: Object.hasOwn(actions, 'idle') ? actions.idle! : { frames: [0] },
    };
    this.transition(this.resting, 0);
  }

  /** Repeated states are coalesced; rejected requests never extend the current timer. */
  play(state: PetState, duration?: number): boolean {
    if (this.disposed) return false;
    if (duration !== undefined && (!Number.isFinite(duration) || duration < 0))
      throw new Error('Invalid state duration');
    const target = Object.hasOwn(this.actions, state) ? state : 'idle';
    if (target === this.current) return false;
    const active = this.actions[this.current]!;
    if (
      active.interruptible === false &&
      (this.actions[target]!.priority ?? 0) <= (active.priority ?? 0)
    )
      return false;
    this.transition(target, duration);
    return true;
  }

  private transition(state: PetState, duration?: number): void {
    if (this.disposed) return;
    clearTimeout(this.timer);
    this.timer = undefined;
    const target = Object.hasOwn(this.actions, state) ? state : 'idle';
    this.current = target;
    const animation = this.actions[target]!;
    const cycle =
      animation.frameDurations?.reduce((a, b) => a + b, 0) ??
      (animation.frames.length / (animation.fps ?? 8)) * 1000;
    const hold =
      duration ??
      (target === this.resting || target === 'idle'
        ? 0
        : (animation.duration ?? (animation.loop === false ? cycle || 1800 : 2400)));
    // Schedule before notifying: a callback may destroy/reset/play again.
    if (hold > 0) this.timer = setTimeout(() => this.transition(this.resting, 0), hold);
    this.onChange(target);
  }

  setResting(state: 'idle' | 'sleeping'): void {
    if (this.disposed) return;
    this.resting = state;
    // A dark-mode change must not interrupt a locked action; its completion uses the new rest.
    if (this.actions[this.current]?.interruptible !== false) this.transition(state, 0);
  }
  /** Administrative reset and theme replacement deliberately bypass locks. */
  reset(): void {
    this.transition(this.resting, 0);
  }
  destroy(): void {
    this.disposed = true;
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}
