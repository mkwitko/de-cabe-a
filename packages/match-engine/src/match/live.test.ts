import { describe, expect, it } from 'vitest';
import type { TimedCommand } from '../contract';
import { advanceMatch } from './advance';
import { matchInput } from './fixture';
import { advanceLiveMatch, startLiveMatch } from './live';

const longBall = (atMs: number): TimedCommand => ({
  atMs,
  team: 0,
  command: { kind: 'team', set: { buildUp: 'long' } },
});

describe('live match', () => {
  it('gives the same chunks as re-simulating from kick-off, forwards, backwards and after a command', () => {
    const input = matchInput(7);
    const m = startLiveMatch(input);
    const same = (cmds: TimedCommand[], from: number, count: number) =>
      expect(advanceLiveMatch(m, cmds, from, count)).toEqual(
        advanceMatch(input, cmds, from, count),
      );
    same([], 0, 600);
    same([], 600, 600);
    same([], 300, 100); // back in time: from a snapshot
    same([], 1500, 300); // skipping ahead
    // The person changes the plan at a minute the server already simulated.
    const c = [longBall(5 * 60_000)];
    expect(advanceMatch(input, c, 2400, 10).frames).not.toEqual(
      advanceMatch(input, [], 2400, 10).frames,
    );
    same(c, 1800, 600);
    same([...c, longBall(12 * 60_000)], 2400, 600);
    same([longBall(5 * 60_000)], 2400, 600); // a command taken back
    same([], 21_000, 1200); // to the end
  });
});
