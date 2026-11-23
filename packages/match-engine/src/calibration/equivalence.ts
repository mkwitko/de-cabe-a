/**
 * MC-252 and MC-046b: equivalence protocol (TEST_STRATEGY.md §2.1), level 2 against level 1.
 *
 *   pnpm --filter @decabeca/match-engine exec tsx src/calibration/equivalence.ts [n] [set]
 *
 * `holdout` runs the held-out cells (HOLDOUT), never used to fit.
 *
 * `set` is `calibration` (where the level 2 constants are fitted) or `validation` (where the
 * verdict is read; never fit on it). Level 1 summaries are cached in L1_CACHE (default
 * .cache/equivalence under the package): they take minutes, level 2 takes seconds.
 * Prints per cell and metric the two means, the difference with its 90% interval, the frozen
 * margin and the verdict; exits 1 if any metric of any cell fails.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MatchInput, TacticalPlan } from '../contract';
import { matchInput, teamInput } from '../match/fixture';
import { simulateLevel2 } from '../possession/engine';
import { defaultPlan } from '../presets';
import { next, rngFrom } from '../random';
import { runMany } from './runner';
import { summary, type Summary } from './summary';

// ── Cells (§2.1 item 6) ─────────────────────────────────────────────────────

const style = (f: string, team: Partial<TacticalPlan['team']>): TacticalPlan => {
  const p = defaultPlan(f);
  p.team = { ...p.team, ...team };
  return p;
};
const PLANS = {
  press: () => style('4-3-3', { block: 'high', pressIntensity: 5, lineHeight: 4 }),
  short: () => style('4-3-3', { buildUp: 'short', tempo: 2, risk: 2 }),
  low: () => style('4-4-2', { block: 'low', lineHeight: 2, onWin: 'counter', onLoss: 'regroup' }),
  possession: () =>
    style('4-3-3', { buildUp: 'short', progression: 'circulate', tempo: 2, risk: 2 }),
  direct: () => style('4-4-2', { buildUp: 'long', progression: 'vertical', tempo: 5, risk: 4 }),
  highLine: () => style('4-3-3', { block: 'high', lineHeight: 5, offsideTrap: true }),
};

/** A cell builds match `i` and says which side is A (the favourite, or the first plan). */
type Cell = (seed: number, i: number) => { input: MatchInput; a: 0 | 1 };
const pair =
  (sa: number, sb: number, pa: () => TacticalPlan, pb: () => TacticalPlan): Cell =>
  (seed, i) => {
    const A = teamInput(seed * 2 + 1, sa, pa(), `a${seed}`);
    const B = teamInput(seed * 2 + 2, sb, pb(), `b${seed}`);
    return i % 2 === 0
      ? { input: matchInput(seed, A, B), a: 0 }
      : { input: matchInput(seed, B, A), a: 1 };
  };
export const CELLS: Record<string, Cell> = {
  balanced: (seed) => ({ input: matchInput(seed), a: 0 }),
  lightFavourite: pair(68, 62, defaultPlan, defaultPlan),
  strongFavourite: pair(72, 58, defaultPlan, defaultPlan),
  pressVsShort: pair(65, 65, PLANS.press, PLANS.short),
  lowVsPossession: pair(65, 65, PLANS.low, PLANS.possession),
  directVsHighLine: pair(65, 65, PLANS.direct, PLANS.highLine),
};

/**
 * Held-out cells: style pairings the fit never sees. They check that level 2 generalises to the
 * career's other tactical mixes instead of memorising the six cells above.
 */
export const HOLDOUT: Record<string, Cell> = {
  highLineVsLow: pair(65, 65, PLANS.highLine, PLANS.low),
  pressVsDirect: pair(65, 65, PLANS.press, PLANS.direct),
  possessionVsPress: pair(65, 65, PLANS.possession, PLANS.press),
  directVsLow: pair(65, 65, PLANS.direct, PLANS.low),
  favouritePressVsLow: pair(70, 60, PLANS.press, PLANS.low),
  /** The career's spread: every match draws both plans and strengths at random (seeded). */
  randomMix: (seed) => {
    const r = rngFrom(seed * 7 + 3);
    const pick = <T>(xs: readonly T[]) => xs[Math.floor(next(r) * xs.length)]!;
    const lv = () => 1 + Math.floor(next(r) * 5);
    const plan = () =>
      style(pick(['4-3-3', '4-4-2', '4-2-3-1', '4-1-4-1', '3-5-2']), {
        buildUp: pick(['short', 'mixed', 'long'] as const),
        progression: pick(['circulate', 'vertical', 'wide', 'central'] as const),
        block: pick(['high', 'mid', 'low'] as const),
        tempo: lv(),
        risk: lv(),
        lineHeight: lv(),
        pressIntensity: lv(),
        onWin: pick(['counter', 'keep'] as const),
        onLoss: pick(['counterPress', 'regroup'] as const),
        offsideTrap: next(r) < 0.3,
      });
    const sa = 58 + Math.floor(next(r) * 15);
    const sb = 58 + Math.floor(next(r) * 15);
    const A = teamInput(seed * 2 + 1, sa, plan(), `a${seed}`);
    const B = teamInput(seed * 2 + 2, sb, plan(), `b${seed}`);
    return { input: matchInput(seed, A, B), a: 0 };
  },
};
const ALL: Record<string, Cell> = { ...CELLS, ...HOLDOUT };

/** Seed sets that never mix (§2.1 item 1); `holdout` runs the held-out cells only. */
export const SEED_SETS = { calibration: 100_000, validation: 200_000, holdout: 300_000 } as const;

// ── Metrics and frozen margins (§2.1 items 2 and 5) ─────────────────────────

type F = (s: Summary, a: 0 | 1) => number;
interface Metric {
  group: 'result' | 'creation' | 'possession' | 'discipline' | 'squad';
  num: F;
  /** Ratio metrics divide the sums (xG per shot, pass completion). */
  den?: F;
  delta: number;
  why: string;
}
const per =
  (k: keyof Summary): F =>
  (s) =>
    ((s[k] as [number, number])[0] + (s[k] as [number, number])[1]) / 2;
const both =
  (k: keyof Summary): F =>
  (s) =>
    (s[k] as [number, number])[0] + (s[k] as [number, number])[1];
const B = (a: 0 | 1) => (a === 0 ? 1 : 0);
const BAND = '02 §11 band width for the Série A reference';
const SEASONS = 'between-season amplitude, Série A 2018 to 2025 (research 12 §4)';
const ASSUMED = 'no published season series; PARAMETER chosen before the first run';

/** Frozen on 2026-11-19 before any comparison ran; changing one needs an ADR (§2.1 item 2). */
export const METRICS: Record<string, Metric> = {
  goalsPerMatch: { group: 'result', num: both('score'), delta: 0.34, why: SEASONS },
  winA: {
    group: 'result',
    num: (s, a) => (s.score[a] > s.score[B(a)] ? 1 : 0),
    delta: 0.09,
    why: `home wins, ${SEASONS}`,
  },
  draw: {
    group: 'result',
    num: (s) => (s.score[0] === s.score[1] ? 1 : 0),
    delta: 0.039,
    why: SEASONS,
  },
  goalDiffA: {
    group: 'result',
    num: (s, a) => s.score[a] - s.score[B(a)],
    delta: 0.34,
    why: `goals per match, ${SEASONS}`,
  },
  shotsPerTeam: { group: 'creation', num: per('shots'), delta: 1.0, why: BAND },
  onTargetPerTeam: { group: 'creation', num: per('onTarget'), delta: 0.6, why: BAND },
  xgPerTeam: { group: 'creation', num: per('xg'), delta: 0.17, why: `half of goals, ${SEASONS}` },
  xgPerShot: {
    group: 'creation',
    num: both('xg'),
    den: both('shots'),
    delta: 0.015,
    why: `goals per shot, ${BAND}`,
  },
  xgDiffA: {
    group: 'creation',
    num: (s, a) => s.xg[a] - s.xg[B(a)],
    delta: 0.34,
    why: `goals per match, ${SEASONS}`,
  },
  possessionA: { group: 'possession', num: (s, a) => s.possession[a], delta: 0.04, why: ASSUMED },
  passesPerTeam: { group: 'possession', num: per('passes'), delta: 13, why: BAND },
  passCompletion: {
    group: 'possession',
    num: both('completed'),
    den: both('passes'),
    delta: 0.04,
    why: BAND,
  },
  progressivePerTeam: {
    group: 'possession',
    num: per('progressive'),
    delta: 3,
    why: `final-third progress (FBref progressive passes), ${ASSUMED}`,
  },
  foulsPerTeam: { group: 'discipline', num: per('fouls'), delta: 2.5, why: BAND },
  yellowsPerTeam: { group: 'discipline', num: per('yellows'), delta: 0.44, why: BAND },
  redsPerTeam: { group: 'discipline', num: per('reds'), delta: 0.05, why: BAND },
  cornersPerTeam: { group: 'discipline', num: per('corners'), delta: 0.46, why: BAND },
  offsidesPerTeam: { group: 'discipline', num: per('offsides'), delta: 0.43, why: BAND },
  staminaEnd: { group: 'squad', num: (s) => s.stamina, delta: 0.05, why: ASSUMED },
  injuriesPerTeam: { group: 'squad', num: per('injuries'), delta: 0.1, why: ASSUMED },
  subsPerTeam: { group: 'squad', num: per('subs'), delta: 0.5, why: ASSUMED },
  rating: { group: 'squad', num: (s) => s.rating, delta: 0.15, why: ASSUMED },
};

/**
 * Distribution of goals per team (§2.1 item 3): total variation distance between the levels
 * must stay below twice the distance between two halves of level 1 plus 0.02 (frozen).
 */
const TV_FACTOR = 2;
const TV_SLACK = 0.02;

// ── Statistics ──────────────────────────────────────────────────────────────

const value = (m: Metric, xs: { s: Summary; a: 0 | 1 }[]) => {
  let n = 0;
  let d = 0;
  for (const { s, a } of xs) {
    n += m.num(s, a);
    d += m.den ? m.den(s, a) : 1;
  }
  return n / (d || 1);
};

/** Difference L2 − L1 and its 90% percentile bootstrap interval (deterministic). */
export function diffInterval(
  m: Metric,
  l1: { s: Summary; a: 0 | 1 }[],
  l2: { s: Summary; a: 0 | 1 }[],
  reps = 1000,
): [number, number, number] {
  const r = rngFrom(11);
  const ds: number[] = [];
  const draw = (xs: typeof l1) =>
    Array.from({ length: xs.length }, () => xs[Math.floor(next(r) * xs.length)]!);
  for (let k = 0; k < reps; k++) ds.push(value(m, draw(l2)) - value(m, draw(l1)));
  ds.sort((x, y) => x - y);
  return [value(m, l2) - value(m, l1), ds[Math.floor(reps * 0.05)]!, ds[Math.floor(reps * 0.95)]!];
}

/** Matches per level for 90% power at margin δ with zero true difference (§2.1 item 4). */
export function sampleSize(m: Metric, l1: { s: Summary; a: 0 | 1 }[]): number {
  const xs = l1.map(({ s, a }) => m.num(s, a) / (m.den ? m.den(s, a) || 1 : 1));
  const mean = xs.reduce((x, y) => x + y, 0) / xs.length;
  const v = xs.reduce((acc, x) => acc + (x - mean) ** 2, 0) / (xs.length - 1);
  return Math.ceil((2 * (1.645 + 1.2816) ** 2 * v) / (m.delta * m.delta));
}

function goalsHistogram(xs: { s: Summary }[]): number[] {
  const h = Array.from({ length: 8 }, () => 0);
  for (const { s } of xs) for (const g of s.score) h[Math.min(7, g)]!++;
  return h.map((c) => c / (2 * xs.length));
}
const tv = (p: number[], q: number[]) => p.reduce((acc, x, i) => acc + Math.abs(x - q[i]!), 0) / 2;

// ── Run ─────────────────────────────────────────────────────────────────────

/**
 * Level 1's source (everything but level 2 and the calibration scripts): a change to it makes
 * every cached level 1 summary stale, so the cache file names carry its hash.
 */
function level1Version(): string {
  const src = new URL('..', import.meta.url).pathname;
  const h = createHash('sha1');
  for (const f of (readdirSync(src, { recursive: true }) as string[]).sort())
    if (f.endsWith('.ts') && !f.endsWith('.test.ts') && !/^(possession|calibration)\//.test(f))
      h.update(f).update(readFileSync(join(src, f)));
  return h.digest('hex').slice(0, 8);
}

async function level1(cell: string, set: keyof typeof SEED_SETS, inputs: MatchInput[]) {
  const dir = process.env.L1_CACHE ?? new URL('../../.cache/equivalence', import.meta.url).pathname;
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${cell}-${set}-${inputs.length}-${level1Version()}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as Summary[];
  const rs = await runMany(inputs, undefined, 1);
  writeFileSync(file, JSON.stringify(rs));
  return rs;
}

export function inputsFor(cell: string, set: keyof typeof SEED_SETS, n: number) {
  const base = SEED_SETS[set] + Object.keys(ALL).indexOf(cell) * 10_000;
  return Array.from({ length: n }, (_, i) => ALL[cell]!(base + i, i));
}

async function main() {
  const n = Number(process.argv[2] ?? 400);
  const set = (process.argv[3] ?? 'calibration') as keyof typeof SEED_SETS;
  const only = process.argv[4]?.split(',');
  let failed = 0;
  for (const cell of Object.keys(set === 'holdout' ? HOLDOUT : CELLS)) {
    if (only && !only.includes(cell)) continue;
    const built = inputsFor(cell, set, n);
    const s1 = await level1(
      cell,
      set,
      built.map((b) => b.input),
    );
    const l1 = s1.map((s, i) => ({ s, a: built[i]!.a }));
    const l2 = built.map((b) => ({ s: summary(simulateLevel2(b.input)), a: b.a }));
    console.log(`\n${cell} (${set}, ${n} matches per level)`);
    for (const [name, m] of Object.entries(METRICS)) {
      const [d, lo, hi] = diffInterval(m, l1, l2);
      const ok = lo > -m.delta && hi < m.delta;
      if (!ok) failed++;
      console.log(
        `  ${name.padEnd(19)} L1 ${value(m, l1).toFixed(3).padStart(8)}  L2 ${value(m, l2).toFixed(3).padStart(8)}  ` +
          `Δ ${d >= 0 ? '+' : ''}${d.toFixed(3)} [${lo.toFixed(3)}, ${hi.toFixed(3)}]  δ ${m.delta}  ` +
          `n90 ${sampleSize(m, l1)}  ${ok ? 'ok' : 'FAIL'}`,
      );
    }
    const half = Math.floor(l1.length / 2);
    const noise = tv(goalsHistogram(l1.slice(0, half)), goalsHistogram(l1.slice(half)));
    const dist = tv(goalsHistogram(l1), goalsHistogram(l2));
    const limit = TV_FACTOR * noise + TV_SLACK;
    if (dist > limit) failed++;
    console.log(
      `  goals per team, total variation ${dist.toFixed(3)} (limit ${limit.toFixed(3)}, level 1 halves ${noise.toFixed(3)})  ${dist <= limit ? 'ok' : 'FAIL'}`,
    );
  }
  console.log(failed ? `\n${failed} failed` : '\nall equivalent');
  process.exitCode = failed ? 1 : 0;
}
if (process.argv[1]?.endsWith('equivalence.ts')) void main();
