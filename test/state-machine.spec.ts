import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PetStateMachine } from '../src/core/PetStateMachine.js';
import { theme } from './support.js';

let machine: PetStateMachine;
const changed = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  machine = new PetStateMachine(changed);
  machine.setActions({
    ...theme.actions,
    emergency: { frames: [0], priority: 20, interruptible: false, duration: 100 },
    peer: { frames: [0], priority: 10 },
  });
  changed.mockClear();
});
afterEach(() => {
  machine.destroy();
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
});

describe('PetStateMachine timing and arbitration', () => {
  it('starts strictly idle, without a timer', () => {
    expect(new PetStateMachine(vi.fn()).state).toBe('idle');
    expect(machine.state).toBe('idle');
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([
    ['juggling', 800],
    ['attention', 500],
  ] as const)('%s returns at exactly its configured %i ms', (state, duration) => {
    expect(machine.play(state)).toBe(true);
    vi.advanceTimersByTime(duration - 1);
    expect(machine.state).toBe(state);
    vi.advanceTimersByTime(1);
    expect(machine.state).toBe('idle');
    expect(changed.mock.calls).toEqual([[state], ['idle']]);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('an explicit duration overrides action duration; duplicates do not extend the deadline', () => {
    machine.play('juggling', 300);
    vi.advanceTimersByTime(200);
    expect(machine.play('juggling', 9000)).toBe(false);
    expect(changed).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(machine.state).toBe('idle');
  });
  it('discards lower/equal priority requests while locked, without delayed replay', () => {
    machine.play('attention');
    vi.advanceTimersByTime(200);
    expect(machine.play('working')).toBe(false);
    expect(machine.play('peer')).toBe(false);
    expect(machine.play('unknown')).toBe(false);
    expect(machine.state).toBe('attention');
    vi.advanceTimersByTime(300);
    expect(machine.state).toBe('idle');
    vi.advanceTimersByTime(10000);
    expect(changed.mock.calls).toEqual([['attention'], ['idle']]);
  });
  it('a strictly higher priority action preempts and cancels the original deadline', () => {
    machine.play('attention');
    vi.advanceTimersByTime(100);
    expect(machine.play('emergency')).toBe(true);
    vi.advanceTimersByTime(100);
    expect(machine.state).toBe('idle');
    const count = changed.mock.calls.length;
    vi.advanceTimersByTime(1000);
    expect(changed).toHaveBeenCalledTimes(count);
  });
  it('interruptible actions replace old timers; duration zero holds until reset', () => {
    machine.play('juggling', 200);
    vi.advanceTimersByTime(100);
    machine.play('working', 300);
    vi.advanceTimersByTime(100);
    expect(machine.state).toBe('working');
    machine.play('drag', 0);
    vi.advanceTimersByTime(10000);
    expect(machine.state).toBe('drag');
    expect(vi.getTimerCount()).toBe(0);
    machine.reset();
    expect(machine.state).toBe('idle');
  });
  it('night mode preserves a locked action and changes its eventual resting state', () => {
    machine.play('attention');
    machine.setResting('sleeping');
    expect(machine.state).toBe('attention');
    vi.advanceTimersByTime(500);
    expect(machine.state).toBe('sleeping');
  });
  it('reset and theme replacement bypass locks; missing idle gets a safe frame', () => {
    machine.play('attention', 0);
    machine.reset();
    expect(machine.state).toBe('idle');
    machine.play('attention', 0);
    machine.setActions({});
    expect(machine.state).toBe('idle');
    expect(machine.play('working')).toBe(false);
  });
  it.each([-1, NaN, Infinity])(
    'rejects invalid duration %s without cancelling the active timer',
    (duration) => {
      machine.play('juggling', 200);
      expect(() => machine.play('working', duration)).toThrow('duration');
      vi.advanceTimersByTime(200);
      expect(machine.state).toBe('idle');
    },
  );
  it('destroy inside onChange cannot leave a newly scheduled timer behind', () => {
    const reentrant = new PetStateMachine((state) => {
      if (state === 'attention') reentrant.destroy();
    });
    reentrant.setActions(theme.actions);
    expect(reentrant.play('attention')).toBe(true);
    expect(reentrant.play('working')).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
