/**
 * A level 1 match kept alive between chunks (ADR-015, revision of 2026-11-16).
 * Same answers as advanceMatch for the same input, commands and range, but the
 * state stays in memory: the next chunk only costs its own ticks. A command
 * the state has not seen yet rewinds to the last snapshot before it, so the
 * person can change the plan at the minute on screen while the server is ahead.
 * The state is plain data (ADR-013 §5), so snapshots are plain copies.
 */
import type { MatchInput, TimedCommand } from '../contract';
import type { MatchChunk } from './advance';
import { frameOf, step, stepUntilEnd } from './engine';
import { resultOf } from './simulate';
import { createMatch, type MatchState } from './state';

/** PARÂMETRO: ticks between snapshots (1 min of play at 4 Hz). */
const SNAP_EVERY = 240;

export interface LiveMatch {
  input: MatchInput;
  state: MatchState;
  /** The commands the state was built with, in the order createMatch keeps them. */
  commands: TimedCommand[];
  /** Copies of the state at every SNAP_EVERY ticks, ascending, none after `state`. */
  snaps: MatchState[];
}

/**
 * Copy of a state for a snapshot or a rewind. Events are final once their step
 * ends (only the event just emitted is touched), so the copies share them and
 * only the array is new: a full clone costs ~30 ms late in a match, this ~2 ms.
 */
const copy = (s: MatchState): MatchState => ({
  ...structuredClone({ ...s, events: [] }),
  events: s.events.slice(),
});

const byTime = (c: TimedCommand[]) => [...c].sort((a, b) => a.atMs - b.atMs);
const same = (a: TimedCommand | undefined, b: TimedCommand | undefined) =>
  a !== undefined && b !== undefined && JSON.stringify(a) === JSON.stringify(b);

export function startLiveMatch(input: MatchInput): LiveMatch {
  return { input, state: createMatch(input), commands: [], snaps: [] };
}

/** Clock from which the new command list differs from the one the state was built with. */
function firstChange(old: TimedCommand[], now: TimedCommand[]): number {
  for (let i = 0; i < Math.max(old.length, now.length); i++)
    if (!same(old[i], now[i])) return Math.min(old[i]?.atMs ?? Infinity, now[i]?.atMs ?? Infinity);
  return Infinity;
}

/** Puts the match where it can serve `from` with `commands`, reusing what it can. */
function rewind(m: LiveMatch, commands: TimedCommand[], from: number) {
  const change = firstChange(m.commands, commands);
  // A state can be kept while it has not passed `from` and has not yet applied
  // anything that changed: every command at `change` or later is still pending.
  const fits = (s: MatchState) => s.tick <= from && s.clockMs < change;
  if (!fits(m.state)) {
    while (m.snaps.length > 0 && !fits(m.snaps.at(-1)!)) m.snaps.pop();
    const snap = m.snaps.at(-1);
    m.state = snap ? copy(snap) : createMatch(m.input, commands);
  }
  if (change !== Infinity)
    m.state.commands = byTime([
      ...m.state.commands.filter((c) => c.atMs < change),
      ...commands.filter((c) => c.atMs >= change),
    ]);
  m.commands = commands;
}

export function advanceLiveMatch(
  m: LiveMatch,
  commands: TimedCommand[],
  from: number,
  count: number,
): MatchChunk {
  rewind(m, byTime(commands), from);
  const s = m.state;
  const tick = () => {
    if (s.tick % SNAP_EVERY === 0 && (m.snaps.at(-1)?.tick ?? -1) < s.tick) m.snaps.push(copy(s));
    step(s);
  };
  while (!s.finished && s.tick < from) tick();
  const frames: number[][] = [];
  const clocks: number[] = [];
  while (!s.finished && frames.length < count) {
    frames.push(frameOf(s));
    clocks.push(s.clockMs);
    tick();
  }
  if (s.finished) stepUntilEnd(s);
  return {
    frames,
    clocks,
    events: [...s.events],
    score: [s.teams[0].score, s.teams[1].score],
    clockMs: s.clockMs,
    period: s.period,
    finished: s.finished,
    result: s.finished ? resultOf(s) : null,
  };
}
