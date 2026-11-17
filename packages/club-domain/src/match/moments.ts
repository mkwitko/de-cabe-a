import {
  advanceLiveMatch,
  type LiveMatch,
  type MatchChunk,
  type TimedCommand,
} from '@decabeca/match-engine';
/**
 * Watching modes of a match (MC-250): the whole match, extended highlights,
 * highlights or goals only. The server simulates on to the next moment and
 * sends only its frames, from a little before the event (the build-up) to a
 * little after it; the plan can change between moments. Used by the API's match workers and by
 * the career in the browser (ADR-020).
 */
export type MomentMode = 'extended' | 'highlights' | 'goals';

export interface MomentEvent {
  kind: string;
  atMs: number;
  data: Record<string, number>;
}

/** Frames are 4 per second of play. */
const TPS = 4;
/**
 * PARÂMETRO: seconds of play shown before and after an event. A goal gets the
 * longest build-up; extended highlights keep a bit more around everything.
 */
const BEFORE = { goal: 14, other: 8 };
const AFTER = 5;
/** Frames to simulate past a moment before it is final: a goal close after would join it. */
export const MOMENT_LOOKAHEAD = BEFORE.goal * TPS;
/** PARÂMETRO: a shot this likely (xg) is a highlight even when it misses. */
const BIG_CHANCE_XG = 0.15;

export function isMoment(e: MomentEvent, mode: MomentMode): boolean {
  if (e.kind === 'goal') return true;
  if (mode === 'goals') return false;
  const red = e.kind === 'card' && e.data.card === 2;
  if (mode === 'highlights')
    return red || (e.kind === 'shot' && (e.data.xg ?? 0) >= BIG_CHANCE_XG) || e.kind === 'save';
  return red || e.kind === 'card' || e.kind === 'shot' || e.kind === 'save' || e.kind === 'injury';
}

/**
 * Frame windows [from, to) around the chosen events, merged when they touch.
 * `clocks[i]` is the match clock of frame i (it jumps while the ball is dead).
 */
export function momentWindows(
  events: readonly MomentEvent[],
  clocks: readonly number[],
  mode: MomentMode,
): [number, number][] {
  const out: [number, number][] = [];
  let i = 0;
  for (const e of [...events].sort((a, b) => a.atMs - b.atMs)) {
    if (!isMoment(e, mode)) continue;
    while (i < clocks.length - 1 && clocks[i]! < e.atMs) i++;
    const before = (e.kind === 'goal' ? BEFORE.goal : BEFORE.other) * TPS;
    const from = Math.max(0, i - before);
    const to = Math.min(clocks.length, i + AFTER * TPS + 1);
    const last = out.at(-1);
    if (last && from <= last[1]) last[1] = Math.max(last[1], to);
    else out.push([from, to]);
  }
  return out;
}

export interface Moment {
  /** Frames of the next moment (empty when none is left). */
  frames: number[][];
  clocks: number[];
  /** First tick after this moment: where to ask for the next one. */
  next: number;
  chunk: Omit<MatchChunk, 'frames' | 'clocks'>;
}

/** Simulates on from `from` until the next moment has been played out, and returns only it. */
export function nextMoment(
  m: LiveMatch,
  commands: TimedCommand[],
  from: number,
  mode: MomentMode,
): Moment {
  const frames: number[][] = [];
  const clocks: number[] = [];
  for (;;) {
    const c = advanceLiveMatch(m, commands, from + frames.length, 1200);
    frames.push(...c.frames);
    clocks.push(...c.clocks);
    const since = clocks[0] ?? c.clockMs;
    const all = momentWindows(
      c.events.filter((e) => e.atMs >= since),
      clocks,
      mode,
    );
    const w = all[0];
    // A moment is done once nothing close after it could still join it.
    if (w && (c.finished || frames.length - w[1] >= MOMENT_LOOKAHEAD)) {
      const { frames: _f, clocks: _c, ...chunk } = c;
      // The match is over for the viewer only after its last moment.
      const last = c.finished && all.length === 1;
      return {
        frames: frames.slice(w[0], w[1]),
        clocks: clocks.slice(w[0], w[1]),
        next: from + w[1],
        chunk: last ? chunk : { ...chunk, finished: false, result: null },
      };
    }
    if (c.finished) {
      const { frames: _f, clocks: _c, ...chunk } = c;
      return { frames: [], clocks: [], next: from + frames.length, chunk };
    }
  }
}
