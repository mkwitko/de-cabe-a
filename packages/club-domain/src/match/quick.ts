/**
 * Level 3 result (01 §5.1, ADR-020): score and cards from the two squads' strength, no match
 * engine. For the matches nobody watches; the level 2 engine (MC-046) takes the person's
 * competitions when it exists. Exact arithmetic only, so every browser gives the same table.
 */
import { next, rngFrom } from '@decabeca/match-engine';
import type { Outcome } from '../competition/season';
import type { Pack } from '../pack/schema';
import { bestRoles } from '../player/ratings';

/** e^x by its series, with + × ÷ only: the same bits in every browser (ADR-020). x in [0, 10]. */
function expSeries(x: number): number {
  let sum = 1;
  let term = 1;
  for (let k = 1; k < 40; k++) sum += term *= x / k;
  return sum;
}

/**
 * Score-only result (level 3): Poisson goals from the two squads' strength and the share of the
 * home stadium taken (0..1, match/stadium.ts). Between equals a crowd of 60 % gives the home side
 * about 49 % of the wins (Série A 2023-2025: 47-50 %), an empty stadium about 42 % (2020, played
 * behind closed doors: netvasco). PARÂMETRO.
 */
export function quickResult(
  seed: number,
  home: number,
  away: number,
  crowd = 0.6,
  /** The referee's cards and sendings-off a match on average (referee.ts). */
  whistle = { cards: 5.2, reds: 0.31 },
  /** On neutral ground (match/stadium.ts): no home side, the two means meet halfway. */
  neutral = false,
  /**
   * Metres the away side climbed (career/travel.ts `climbOf`): half a goal of difference per
   * 1,000 m (McSharry, BMJ 2007), split evenly between the two means. PARÂMETRO: the split.
   */
  climb = 0,
): Outcome {
  const r = rngFrom(seed);
  const goals = (mean: number) => {
    // Knuth: fine for means under 5.
    let k = 0;
    for (let p = next(r), l = 1 / expSeries(mean); p > l; p *= next(r)) k++;
    return k;
  };
  const d = (home - away) / 10;
  const thin = (0.25 * climb) / 1000;
  return {
    goals: neutral
      ? [goals(Math.max(0.2, 1.225 + 0.325 * d)), goals(Math.max(0.2, 1.225 - 0.325 * d))]
      : [
          goals(Math.max(0.2, 1.3 + 0.35 * crowd + 0.35 * d + thin)),
          goals(Math.max(0.2, 1.15 - 0.25 * crowd - 0.3 * d - thin)),
        ],
    shootout: null,
    // Each side gets half the referee's yellows and half his sendings-off, Poisson.
    cards: [
      [goals((whistle.cards - whistle.reds) / 2), goals(whistle.reds / 2)],
      [goals((whistle.cards - whistle.reds) / 2), goals(whistle.reds / 2)],
    ],
  };
}

const top16 = (rs: number[]) =>
  rs
    .sort((a, b) => b - a)
    .slice(0, 16)
    .reduce((a, b) => a + b, 0) / 16;

export function clubStrength(pack: Pack): Map<string, number> {
  const by = new Map<string, number[]>();
  for (const p of pack.players)
    if (p.clubId)
      (by.get(p.clubId) ?? by.set(p.clubId, []).get(p.clubId)!).push(
        bestRoles(p.attributes, 1)[0]!.rating,
      );
  return new Map([...by].map(([c, rs]) => [c, top16(rs)]));
}

/** `clubStrength` of one club, rating only its own players (not the whole world's). */
export const clubStrengthOf = (squad: readonly Pack['players'][number][]): number | undefined => {
  const rs = squad.map((p) => bestRoles(p.attributes, 1)[0]!.rating);
  return rs.length ? top16(rs) : undefined;
};
