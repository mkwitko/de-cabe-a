/**
 * The simulation work of the friendly match, run inside a worker of
 * match-pool.ts (never on the request thread). Each worker keeps the matches
 * it serves alive (advanceLiveMatch), so a chunk costs only its own ticks.
 * The answers stay pure: same job, same answer, whatever the worker holds.
 */
import {
  advanceLiveMatch,
  startLiveMatch,
  type LiveMatch,
  type MatchChunk,
  type MatchInput,
  type TimedCommand,
} from '@decabeca/match-engine';
import { MOMENT_LOOKAHEAD, momentWindows, type MomentMode } from './moments';

export type MatchJob =
  | {
      op: 'advance';
      key: string;
      input: MatchInput;
      commands: TimedCommand[];
      from: number;
      count: number;
    }
  | {
      op: 'moment';
      key: string;
      input: MatchInput;
      commands: TimedCommand[];
      from: number;
      mode: MomentMode;
    };

export interface Moment {
  /** Frames of the next moment (empty when none is left). */
  frames: number[][];
  clocks: number[];
  /** First tick after this moment: where to ask for the next one. */
  next: number;
  chunk: Omit<MatchChunk, 'frames' | 'clocks'>;
}

/**
 * PARÂMETRO: matches one worker keeps alive (a few MB each, mostly snapshots).
 * ponytail: least recently used out; a match pushed out just starts again from kick-off.
 */
const MAX_LIVE = 40;
const live = new Map<string, LiveMatch>();

function matchFor(key: string, input: MatchInput): LiveMatch {
  let m = live.get(key);
  if (m) live.delete(key);
  else m = startLiveMatch(input);
  live.set(key, m);
  if (live.size > MAX_LIVE) live.delete(live.keys().next().value!);
  return m;
}

/** Simulates on from `from` until the next moment has been played out, and returns only it. */
function nextMoment(
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

export function runJob(job: MatchJob): MatchChunk | Moment {
  const m = matchFor(job.key, job.input);
  return job.op === 'advance'
    ? advanceLiveMatch(m, job.commands, job.from, job.count)
    : nextMoment(m, job.commands, job.from, job.mode);
}
