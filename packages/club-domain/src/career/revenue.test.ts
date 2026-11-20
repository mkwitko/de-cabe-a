import { describe, expect, it } from 'vitest';
import { dayOf } from '../competition/calendar';
import { generateDevPack } from '../generate/pack';
import { openCareer } from './advance';
import { priced, pricesOf } from './prices';
import {
  BLOCS,
  COPA_B,
  COPA_CHAMPION,
  COPA_LOW,
  COPA_RUNNER_UP,
  QUOTA,
  TV_SERIE_A,
  TV_SERIE_B,
  copaCredits,
  endCredits,
  performanceTv,
  postCups,
  postSeasonEnd,
  resultsIncome,
  tvOf,
} from './revenue';
import { nationalDivisions } from './start';

const pack = generateDevPack();
const divs = nationalDivisions(pack);
const tierOf = (id: string) => divs.find((d) => d.clubIds.includes(id))!.tier;

describe('revenue lines (CBF 2026 tables)', () => {
  it('quotas: Série D R$ 500 mil, Série C R$ 1.55 mi, none above', () => {
    expect(QUOTA[4]).toBe(500_000);
    expect(QUOTA[3]).toBe(1_550_000);
    expect(QUOTA[1]).toBeUndefined();
    expect(QUOTA[2]).toBeUndefined();
  });

  it('Série B pays the same TV money to everyone, Série C and D none', () => {
    const w = openCareer(pack, 5, divs[2]!.clubIds[0]!);
    for (const id of divs[1]!.clubIds)
      expect(tvOf(w, id, 2)).toEqual({ equal: TV_SERIE_B, audience: 0, perfMean: 0 });
    expect(tvOf(w, divs[2]!.clubIds[0]!, 3)).toEqual({ equal: 0, audience: 0, perfMean: 0 });
  });

  it('Série A TV: blocs split a club mean into equal, performance and audience', () => {
    const w = openCareer(pack, 5, divs[0]!.clubIds[0]!);
    const parts = divs[0]!.clubIds.map((id) => tvOf(w, id, 1));
    for (const p of parts) {
      const bloc = [BLOCS.libra, BLOCS.ffu].find(
        (b) => p.equal === Math.round((TV_SERIE_A * b.equal) / 100),
      )!;
      expect(bloc).toBeDefined();
      expect(p.perfMean).toBe(Math.round((TV_SERIE_A * bloc.perf) / 100));
    }
    // The audience part follows the fan base: the biggest crowd gets the most.
    const fans = (id: string) => pack.clubs.find((c) => c.id === id)!.fans.size;
    const ids = divs[0]!.clubIds;
    const big = ids.reduce((a, b) => (fans(b) > fans(a) ? b : a));
    const small = ids.reduce((a, b) => (fans(b) < fans(a) ? b : a));
    expect(tvOf(w, big, 1).audience).toBeGreaterThan(tvOf(w, small, 1).audience);
    // By position: champion above the mean above the last, the mean paid at mid table.
    expect(performanceTv(1000, 1, 20)).toBeGreaterThan(performanceTv(1000, 10, 20));
    expect(performanceTv(1000, 10, 20)).toBeGreaterThan(performanceTv(1000, 20, 20));
    expect(performanceTv(1000, 0, 20)).toBe(0);
  });

  it('Copa do Brasil: entry by group, amounts by phase, one champion, one runner-up', () => {
    const w = openCareer(pack, 9, divs[0]!.clubIds[0]!);
    const all = [...nationalDivisions(pack)].flatMap((d) => d.clubIds);
    const credits = all.map((id) => ({ id, tier: tierOf(id), list: copaCredits(w, id) }));
    const finals = credits.flatMap((c) => c.list.filter((x) => x.phase === 9));
    expect(finals.map((x) => x.amount).sort((a, b) => a - b)).toEqual([
      COPA_RUNNER_UP,
      COPA_CHAMPION,
    ]);
    expect(finals.every((x) => x.line === 'prize')).toBe(true);
    for (const { tier, list } of credits) {
      const table = tier === 2 ? COPA_B : COPA_LOW;
      for (const c of list) {
        expect(c.source).toBe('copa');
        if (c.phase < 9) {
          expect(c.line).toBe('advance');
          expect(c.amount).toBe(table[c.phase - 1]);
        }
      }
      // A Série A club comes in at the 5th phase; the lower ones before it.
      if (tier === 1 && list.length) expect(list[0]!.phase).toBe(5);
      if (tier === 4 && list.length) expect(list[0]!.phase).toBe(1);
      // Never twice in a phase, in order of play.
      expect(list.map((x) => x.phase)).toEqual(
        [...new Set(list.map((x) => x.phase))].sort((a, b) => a - b),
      );
    }
  });

  it('the person and the other clubs read the same tables', () => {
    for (const tier of [1, 2, 3, 4]) {
      const clubId = divs[tier - 1]!.clubIds[2]!;
      const w = openCareer(pack, 13, clubId);
      const places = divs[tier - 1]!.clubIds.length;
      const prices = pricesOf(w).prices;
      postCups(w, dayOf(`${w.season.season}-01-01`) - 1, dayOf(`${w.season.season}-12-31`));
      postSeasonEnd(w, 3, places);
      const posted = w.ledger.entries
        .filter((e) => ['advance', 'prize'].includes(e.kind) || e.key.startsWith('tv:tv:'))
        .reduce((s, e) => s + e.amount, 0);
      // What the other clubs' books add at the turn (budgets already hold the mean TV part).
      const perfMean = tvOf(w, clubId, tier).perfMean;
      expect(resultsIncome(w, clubId, 3, places) + priced(perfMean, prices)).toBe(posted);
      // Posting twice pays once.
      const cash = w.ledger.cash;
      postCups(w, dayOf(`${w.season.season}-01-01`) - 1, dayOf(`${w.season.season}-12-31`));
      postSeasonEnd(w, 3, places);
      expect(w.ledger.cash).toBe(cash);
    }
  });

  it('only a Série A club is paid TV by position at the end of the season', () => {
    const a = openCareer(pack, 3, divs[0]!.clubIds[0]!);
    expect(endCredits(a, divs[0]!.clubIds[0]!, 1, 20).map((c) => c.line)).toEqual(['tv']);
    expect(endCredits(a, divs[1]!.clubIds[0]!, 1, 20).filter((c) => c.line === 'tv')).toEqual([]);
  });
});
