/**
 * `mata-mata` and `final` interpreter (MC-171; 05 §2): pairing, bracket,
 * host, and the tie decided by aggregate and then the regulation's rules.
 *
 * Engine boundary: extra time and penalties are asked of the engine in a single
 * game (`deciderRules`); over two legs the second leg plays extra time when the
 * regulation has it, the engine told the first leg's goals (fixture-input.ts
 * `secondLeg`). Extra time is then inside the last leg's score. The engine contract has a
 * shoot-out field but the engine does not fill it yet: until it does, a
 * level tie that goes to penalties is settled by a seeded 50% draw, marked
 * `penaltyDraw` in the result (PARÂMETRO, temporary).
 */
import { fork, next, rngFrom } from '@decabeca/match-engine';
import { shuffle, type Pair } from './league';
import type { KnockoutBreaker, Phase } from './schema';

type Knockout = Extract<Phase, { kind: 'mata-mata' }>;

/** `a` is always the better seed. */
export interface Tie {
  a: string;
  b: string;
  winner?: string;
}
export interface Bracket {
  /** Entrant order = seed order. */
  seeds: string[];
  rounds: Tie[][];
}

const isPow2 = (n: number) => n > 0 && (n & (n - 1)) === 0;

/** Standard bracket positions: 1 v 8, 4 v 5, 2 v 7, 3 v 6 (seeds 1 and 2 meet last). */
function bracketOrder(n: number): number[] {
  let order = [0];
  while (order.length < n) {
    const m = order.length * 2;
    order = order.flatMap((s) => [s, m - 1 - s]);
  }
  return order;
}

export function startBracket(
  entrants: readonly string[],
  pairing: Knockout['pairing'],
  seed: number,
): Bracket {
  const n = entrants.length;
  if (n < 2 || n % 2) throw new Error(`knockout needs an even number of clubs, got ${n}`);
  const rank = (c: string) => entrants.indexOf(c);
  const tie = (x: string, y: string): Tie => (rank(x) < rank(y) ? { a: x, b: y } : { a: y, b: x });
  let order: string[];
  if (pairing === 'fixed') order = [...entrants];
  else if (pairing === 'draw') order = shuffle(entrants, seed, 'knockout-draw');
  else if (isPow2(n)) order = bracketOrder(n).map((i) => entrants[i]!);
  else order = Array.from({ length: n }, (_, i) => entrants[i % 2 ? n - 1 - (i >> 1) : i >> 1]!);
  const first: Tie[] = [];
  for (let i = 0; i < n; i += 2) first.push(tie(order[i]!, order[i + 1]!));
  return { seeds: [...entrants], rounds: [first] };
}

/**
 * Next round when the last one is decided and more than `survivors` remain:
 * winners of neighbouring ties meet. Returns the same bracket when nothing to do.
 */
export function advance(b: Bracket, survivors: number): Bracket {
  const last = b.rounds.at(-1)!;
  if (last.some((t) => !t.winner) || last.length <= survivors) return b;
  if (last.length % 2) throw new Error('bracket cannot reach the survivors');
  const rank = (c: string) => b.seeds.indexOf(c);
  const round: Tie[] = [];
  for (let i = 0; i < last.length; i += 2) {
    const [x, y] = [last[i]!.winner!, last[i + 1]!.winner!];
    round.push(rank(x) < rank(y) ? { a: x, b: y } : { a: y, b: x });
  }
  return { ...b, rounds: [...b.rounds, round] };
}

/** Survivors first, then the clubs out in each round from last to first; seed order inside. */
export function bracketTable(b: Bracket): string[] {
  const rank = (c: string) => b.seeds.indexOf(c);
  const bySeed = (xs: string[]) => xs.sort((x, y) => rank(x) - rank(y));
  const out = bySeed(b.rounds.at(-1)!.map((t) => t.winner!));
  for (let r = b.rounds.length - 1; r >= 0; r--)
    out.push(...bySeed(b.rounds[r]!.map((t) => (t.winner === t.a ? t.b : t.a))));
  return out;
}

/** Matches of a tie, home first; the host plays the single game or the second leg at home. */
export function legsOf(
  t: Pick<Tie, 'a' | 'b'>,
  legs: 1 | 2,
  host: Knockout['host'],
  seed: number,
  better: (x: string, y: string) => string,
): Pair[] {
  const h =
    host === 'fixed'
      ? t.a
      : host === 'draw'
        ? next(fork(rngFrom(seed), `host:${t.a}:${t.b}`)) < 0.5
          ? t.a
          : t.b
        : better(t.a, t.b);
  const o = h === t.a ? t.b : t.a;
  return legs === 1
    ? [[h, o]]
    : [
        [o, h],
        [h, o],
      ];
}

export const deciderRules = (legs: 1 | 2, breakers: readonly KnockoutBreaker[]) => ({
  extraTime: legs === 1 && breakers.includes('extraTime'),
  penalties: legs === 1 && breakers.includes('penalties'),
});

export interface LegResult {
  home: string;
  away: string;
  /** Goals at the end of the match, extra time included. */
  goals: [number, number];
  shootout: [number, number] | null;
}
export interface TieDecision {
  winner: string;
  by: 'aggregate' | 'awayGoals' | 'penalties' | 'penaltyDraw' | 'betterCampaign';
}

export function decideTie(
  t: Pick<Tie, 'a' | 'b'>,
  legs: readonly LegResult[],
  breakers: readonly KnockoutBreaker[],
  seed: number,
): TieDecision {
  const goals = (c: string, awayOnly = false) =>
    legs.reduce(
      (s, l) => s + (l.home === c && !awayOnly ? l.goals[0] : 0) + (l.away === c ? l.goals[1] : 0),
      0,
    );
  const pick = (ga: number, gb: number, by: TieDecision['by']): TieDecision | null =>
    ga === gb ? null : { winner: ga > gb ? t.a : t.b, by };
  const agg = pick(goals(t.a), goals(t.b), 'aggregate');
  if (agg) return agg;
  for (const b of breakers) {
    if (b === 'awayGoals' && legs.length > 1) {
      const d = pick(goals(t.a, true), goals(t.b, true), 'awayGoals');
      if (d) return d;
    }
    if (b === 'penalties') {
      const last = legs.at(-1)!;
      if (last.shootout) {
        const [h, w] = last.shootout;
        const homeIsA = last.home === t.a;
        const d = pick(homeIsA ? h : w, homeIsA ? w : h, 'penalties');
        if (d) return d;
      }
      const coin = next(fork(rngFrom(seed), `penalties:${t.a}:${t.b}`));
      return { winner: coin < 0.5 ? t.a : t.b, by: 'penaltyDraw' };
    }
    if (b === 'betterCampaign') return { winner: t.a, by: 'betterCampaign' };
    // extraTime: already inside the last game's score (single game or watched second leg).
  }
  throw new Error(`tie ${t.a} v ${t.b} level and no rule decides it`);
}
