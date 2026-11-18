import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from '../career/advance';
import { jobOffers } from '../career/start';
import { dayOf } from '../competition/calendar';
import { sellerStance } from './deals';
import {
  bargaining,
  eyeOf,
  levelError,
  seenCeiling,
  seenLevel,
  seenValue,
  setJudgementClock,
} from './judgement';
import { squadPlanOf } from './plan';
import { marketRound } from './rounds';
import { marketValue, readingsOf } from './value';

const pack = generateDevPack();
const read = readingsOf(pack);
const withEye = (clubId: string, level: number) => ({
  ...pack,
  clubs: pack.clubs.map((c) =>
    c.id === clubId
      ? { ...c, departments: { ...c.departments, scouting: level, football: level } }
      : c,
  ),
});
const clubA = pack.clubs[0]!.id;
const others = pack.players.filter((p) => p.clubId && p.clubId !== clubA).slice(0, 400);
const own = pack.players.filter((p) => p.clubId === clubA);

describe("directors' judgement (06 §2.3, 04 §8.2)", () => {
  it('a club is off by a fixed amount on each player; the best office barely at all', () => {
    const poor = withEye(clubA, 1);
    const fine = withEye(clubA, 5);
    const errs = (pk: typeof pack) => others.map((p) => Math.abs(levelError(pk, clubA, p)));
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(Math.max(...errs(poor))).toBeLessThanOrEqual(7);
    expect(Math.max(...errs(fine))).toBeLessThanOrEqual(1);
    expect(mean(errs(poor))).toBeGreaterThan(mean(errs(fine)) * 3);
    // The same club has the same opinion every time; another club has its own.
    expect(errs(poor)).toEqual(errs(poor));
    const clubB = pack.clubs[1]!.id;
    expect(others.map((p) => levelError(withEye(clubB, 1), clubB, p))).not.toEqual(
      others.map((p) => levelError(poor, clubA, p)),
    );
    // Another career, another set of opinions.
    const other = withEye(clubA, 1);
    setJudgementClock(other, 12345, 2026);
    expect(others.map((p) => levelError(other, clubA, p))).not.toEqual(
      others.map((p) => levelError(poor, clubA, p)),
    );
    // An office learns its own players: after two more seasons the error is three quarters or less.
    const later = withEye(clubA, 1);
    setJudgementClock(later, 0, 2028);
    for (const p of own)
      expect(Math.abs(levelError(later, clubA, p))).toBeLessThanOrEqual(
        Math.ceil(Math.abs(levelError(poor, clubA, p)) * 0.75),
      );
    // A club knows its own players better than anyone else's.
    expect(Math.max(...own.map((p) => Math.abs(levelError(poor, clubA, p))))).toBeLessThanOrEqual(
      4,
    );
    expect(own.every((p) => levelError(fine, clubA, p) === 0)).toBe(true);
  });

  it('what a club sees stays in range, and the ceiling never sits under the level', () => {
    const poor = withEye(clubA, 1);
    for (const p of others) {
      const level = seenLevel(poor, clubA, p);
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(99);
      expect(seenCeiling(poor, clubA, p)).toBeGreaterThanOrEqual(level);
      expect(Math.abs(level - read.get(p.id)!.level)).toBeLessThanOrEqual(7);
    }
    // A misjudged level moves the value the same way.
    const up = others.find((p) => levelError(poor, clubA, p) >= 4)!;
    const down = others.find((p) => levelError(poor, clubA, p) <= -4)!;
    expect(seenValue(poor, clubA, up, 2026)).toBeGreaterThan(marketValue(poor, up, 2026));
    expect(seenValue(poor, clubA, down, 2026)).toBeLessThan(marketValue(poor, down, 2026));
  });

  it('a good office opens lower, stops sooner and holds out for more', () => {
    const poor = bargaining(withEye(clubA, 1), clubA);
    const fine = bargaining(withEye(clubA, 5), clubA);
    expect(fine.opens).toBeLessThan(poor.opens);
    expect(fine.pays).toBeLessThan(poor.pays);
    expect(fine.holds).toBeGreaterThan(poor.holds);
    expect(eyeOf(pack, clubA).football).toBeGreaterThanOrEqual(1);
    // Selling the same player to the same buyer, the good office asks for more.
    const p = own.find((x) => squadPlanOf({ pack, clubId: clubA }).xi.includes(x.id))!;
    const buyer = pack.clubs[5]!.id;
    const ask = (pk: typeof pack) => sellerStance({ pack: pk, clubId: clubA }, p, buyer, 2026);
    expect(ask(withEye(clubA, 5)).floor).toBeGreaterThan(ask(withEye(clubA, 1)).floor);
  });

  it('over a window, clubs with poor scouting misjudge what they buy by more', () => {
    const w = openCareer(pack, 97, jobOffers(pack, 5)[0]!.clubId);
    const day = dayOf('2026-04-16');
    const deals = [0, 14, 28, 42].flatMap((k) => marketRound(w, day + k)).filter((d) => d.from);
    const off = (poor: boolean) => {
      const of = deals.filter((d) => eyeOf(pack, d.to).scouting <= 2 === poor);
      const wrong = of.map((d) => Math.abs(d.seen - read.get(d.player)!.level));
      return { n: of.length, mean: wrong.reduce((a, b) => a + b, 0) / Math.max(1, of.length) };
    };
    const poor = off(true);
    const fine = off(false);
    expect(poor.n).toBeGreaterThan(5);
    expect(fine.n).toBeGreaterThan(5);
    expect(poor.mean).toBeGreaterThan(fine.mean);
  });
});
