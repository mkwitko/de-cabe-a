/**
 * The simulation work of the friendly match, run inside a worker of
 * match-pool.ts (never on the request thread). Each worker keeps the matches
 * it serves alive (advanceLiveMatch), so a chunk costs only its own ticks.
 * The answers stay pure: same job, same answer, whatever the worker holds.
 */
import { nextMoment, type Moment, type MomentMode } from '@decabeca/club-domain';
import {
  advanceLiveMatch,
  startLiveMatch,
  type LiveMatch,
  type MatchChunk,
  type MatchInput,
  type TimedCommand,
} from '@decabeca/match-engine';

export type { Moment };

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

export function runJob(job: MatchJob): MatchChunk | Moment {
  const m = matchFor(job.key, job.input);
  return job.op === 'advance'
    ? advanceLiveMatch(m, job.commands, job.from, job.count)
    : nextMoment(m, job.commands, job.from, job.mode);
}
