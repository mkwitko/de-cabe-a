/**
 * MC-201 measurement core, pure and runnable in Node and in the browser:
 * one season of the big fictional pack day by day with the score-only
 * result model (level 3), timing each day and sizing the world.
 * Not used by the game; `storage.ts` (Node) and the browser page call it.
 */
import { fork, next, rngFrom } from '@decabeca/match-engine';
import { clubStrength, quickResult } from '../match/quick';
import { generateDevPack } from '../generate/pack';
import { matchesOn, nextDay, record, startSeason } from '../competition/season';
import type { Pack } from '../pack/schema';

/** JSON with Maps as entry lists. */
export const toJson = (x: unknown) =>
  JSON.stringify(x, (_k, v) => (v instanceof Map ? [...v.entries()] : v));

export interface SeasonBench {
  clubs: number;
  players: number;
  matches: number;
  matchDays: number;
  /** ms per match day: domain work + level 3 results. */
  dayMs: { p50: number; p95: number; max: number; total: number };
  bytes: { pack: number; seasonStart: number; seasonEnd: number };
}

export function benchSeason(now: () => number, pack: Pack = generateDevPack()): SeasonBench {
  const strength = clubStrength(pack);
  const s = startSeason(pack, { seed: 7 });
  const seasonStart = toJson(s).length;
  const days: number[] = [];
  let matches = 0;
  const root = rngFrom(7);
  for (let day = nextDay(s); day !== null; day = nextDay(s)) {
    const t = now();
    for (const id of matchesOn(s, day)) {
      const m = s.meta.get(id)!;
      const seed = Math.floor(next(fork(root, id)) * 0x7fffffff);
      record(s, id, quickResult(seed, strength.get(m.home) ?? 50, strength.get(m.away) ?? 50));
      matches++;
    }
    days.push(now() - t);
  }
  const sorted = [...days].sort((a, b) => a - b);
  const q = (f: number) => sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))]!;
  return {
    clubs: pack.clubs.length,
    players: pack.players.length,
    matches,
    matchDays: days.length,
    dayMs: {
      p50: q(0.5),
      p95: q(0.95),
      max: sorted.at(-1)!,
      total: days.reduce((a, b) => a + b, 0),
    },
    bytes: { pack: toJson(pack).length, seasonStart, seasonEnd: toJson(s).length },
  };
}
