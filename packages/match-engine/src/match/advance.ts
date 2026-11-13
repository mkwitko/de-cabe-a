/**
 * Chunked access to a level 1 match for a client that watches it (ADR-015):
 * the server re-runs the match from its input and commands up to the chunk
 * and returns those frames. Pure: same request, same answer, so retries are safe.
 * ponytail: re-simulates from kick-off each chunk (about a second at most);
 * keep a state snapshot per match if the cost shows up.
 */
import type { MatchEvent, MatchInput, MatchResult, TimedCommand } from '../contract';
import { frameOf, step, stepUntilEnd } from './engine';
import { substitutions } from './coach';
import { resultOf } from './simulate';
import { createMatch } from './state';

export const MATCH_MAX_CHUNK = 1200;

export interface MatchChunk {
  /** Frames for ticks from … from + count − 1 (fewer at the end). */
  frames: number[][];
  /** Match clock in ms at each frame (the clock jumps while the ball is dead). */
  clocks: number[];
  /** Events up to the last frame. */
  events: MatchEvent[];
  score: [number, number];
  clockMs: number;
  period: number;
  finished: boolean;
  /** Full result once the match is over. */
  result: MatchResult | null;
}

export function advanceMatch(input: MatchInput, commands: TimedCommand[], from: number, count: number): MatchChunk {
  const s = createMatch(input, commands);
  const tick = () => {
    step(s);
    if (s.tick % 40 === 0) substitutions(s, false);
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
    events: s.events,
    score: [s.teams[0].score, s.teams[1].score],
    clockMs: s.clockMs,
    period: s.period,
    finished: s.finished,
    result: s.finished ? resultOf(s) : null,
  };
}
