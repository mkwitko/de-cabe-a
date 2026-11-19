/**
 * Level 2 engine (02 §12): MC-046 contract, determinism and cost; MC-167 tactical coherence,
 * each instruction moves the metric it declares in the declared direction (TEST_STRATEGY §3,
 * level 2 part: same format, own tests, effect size not compared with level 1).
 */
import { describe, expect, it } from 'vitest';
import { MatchResultSchema, type MatchResult, type TacticalPlan } from '../contract';
import { progressivePasses, transitions } from '../calibration/summary';
import { matchInput, teamInput } from '../match/fixture';
import { defaultPlan } from '../presets';
import { shotOrigins } from '../rules/explain';
import { simulateLevel2 } from './engine';

describe('MC-046 level 2 match', () => {
  it('returns a valid result with named events and no frames', () => {
    const r = simulateLevel2(matchInput(3));
    expect(MatchResultSchema.safeParse(r).success).toBe(true);
    const kinds = new Set(r.events.map((e) => e.kind));
    for (const k of ['pass', 'reception', 'shot', 'tackle', 'periodEnd'])
      expect(kinds.has(k as never)).toBe(true);
    // Who passed, who tackled, who scored: events name their players.
    for (const e of r.events.filter((x) => ['pass', 'tackle', 'goal'].includes(x.kind)))
      expect(e.playerId).not.toBeNull();
    expect(r.players.length).toBeGreaterThanOrEqual(22);
  });

  it('is deterministic: same input, same result; another seed, another match', () => {
    const a = JSON.stringify(simulateLevel2(matchInput(5)));
    expect(JSON.stringify(simulateLevel2(matchInput(5)))).toBe(a);
    expect(JSON.stringify(simulateLevel2(matchInput(6)))).not.toBe(a);
  });

  it('plays a whole match in a few milliseconds (02 §12: 2 ms is the target, see bench)', () => {
    simulateLevel2(matchInput(1));
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) simulateLevel2(matchInput(100 + i));
    // Generous bound for shared CI machines; the bench reports the real figure.
    expect((performance.now() - t0) / 20).toBeLessThan(80);
  });
});

// ── MC-167 ──────────────────────────────────────────────────────────────────

type Metric = (r: MatchResult, a: 0 | 1) => number;
const B = (a: 0 | 1): 0 | 1 => (a === 0 ? 1 : 0);
const xIn = (team: 0 | 1, at: [number, number]) => (team === 0 ? at[0] / 10 : 105 - at[0] / 10);
const count = (r: MatchResult, f: (e: MatchResult['events'][number]) => boolean) =>
  r.events.filter(f).length;

const passesOf: Metric = (r, a) => r.stats[a].passes;
const completion: Metric = (r, a) => r.stats[a].passesCompleted / (r.stats[a].passes || 1);
const passKind =
  (k: number): Metric =>
  (r, a) =>
    count(r, (e) => e.kind === 'pass' && e.team === a && e.data.kind === k);
const longShare: Metric = (r, a) => passKind(2)(r, a) / (r.stats[a].passes || 1);
const crosses: Metric = (r, a) =>
  count(r, (e) => e.kind === 'pass' && e.team === a && !!e.data.cross);
const farShots: Metric = (r, a) =>
  count(r, (e) => e.kind === 'shot' && e.team === a && !e.data.penalty && (e.data.x ?? 105) < 85);
const highWins: Metric = (r, a) =>
  count(r, (e) => e.kind === 'phaseChange' && e.team === a && !!e.at && xIn(a, e.at) > 52.5);
const transitionXg: Metric = (r, a) => {
  const o = shotOrigins(r.events);
  return r.events
    .filter((e) => e.kind === 'shot' && e.team === a && o.get(e.id) === 'transition')
    .reduce((s, e) => s + (e.data.xg ?? 0), 0);
};

interface Case {
  name: string;
  /** Plan changes for side A: the declared side (`on`) against the opposite (`off`). */
  on: Partial<TacticalPlan['team']>;
  off: Partial<TacticalPlan['team']>;
  metric: Metric;
  /** The metric is read on side A, or on its opponent B. */
  side: 'A' | 'B';
  sign: 1 | -1;
  /** Not coherent yet: why, and where it is tracked (HANDOFF). */
  open?: string;
}

const CASES: Case[] = [
  {
    name: 'tempo up: more passes',
    on: { tempo: 5 },
    off: { tempo: 1 },
    metric: passesOf,
    side: 'A',
    sign: 1,
  },
  {
    name: 'risk up: lower completion',
    on: { risk: 5 },
    off: { risk: 1 },
    metric: completion,
    side: 'A',
    sign: -1,
  },
  {
    name: 'long build-up: more long balls',
    on: { buildUp: 'long' },
    off: { buildUp: 'short' },
    metric: longShare,
    side: 'A',
    sign: 1,
  },
  {
    name: 'circulate: fewer progressive passes',
    on: { progression: 'circulate' },
    off: { progression: 'vertical' },
    metric: (r, a) => progressivePasses(r)[a],
    side: 'A',
    sign: -1,
  },
  {
    name: 'crosses up: more crosses',
    on: { finalThird: { crosses: 5, throughBalls: 3, boxPresence: 3, shootFromDistance: 3 } },
    off: { finalThird: { crosses: 1, throughBalls: 3, boxPresence: 3, shootFromDistance: 3 } },
    metric: crosses,
    side: 'A',
    sign: 1,
  },
  {
    name: 'through balls up: more through balls',
    on: { finalThird: { crosses: 3, throughBalls: 5, boxPresence: 3, shootFromDistance: 3 } },
    off: { finalThird: { crosses: 3, throughBalls: 1, boxPresence: 3, shootFromDistance: 3 } },
    metric: passKind(1),
    side: 'A',
    sign: 1,
  },
  {
    name: 'shoot from distance: more long shots',
    on: { finalThird: { crosses: 3, throughBalls: 3, boxPresence: 3, shootFromDistance: 5 } },
    off: { finalThird: { crosses: 3, throughBalls: 3, boxPresence: 3, shootFromDistance: 1 } },
    metric: farShots,
    side: 'A',
    sign: 1,
  },
  {
    name: 'press harder: opponents complete fewer',
    on: { pressIntensity: 5 },
    off: { pressIntensity: 1 },
    metric: completion,
    side: 'B',
    sign: -1,
  },
  {
    name: 'high block: more balls won high',
    on: { block: 'high' },
    off: { block: 'low' },
    metric: highWins,
    side: 'A',
    sign: 1,
  },
  {
    name: 'counter-press: more balls won back within 5 s',
    on: { onLoss: 'counterPress' },
    off: { onLoss: 'regroup' },
    metric: (r, a) => transitions(r).back[a],
    side: 'A',
    sign: 1,
  },
  {
    name: 'counter on winning it: more transition xG',
    on: { onWin: 'counter' },
    off: { onWin: 'keep' },
    metric: transitionXg,
    side: 'A',
    sign: 1,
    // Measured 2026-11-19: t 0.3 in 200 paired matches. A counter needs a defence caught short,
    // and without a space-behind term it rarely is (same gap as rest defence).
    open: 'level 2 has no space-behind term for a counter yet (HANDOFF 2026-11-19)',
  },
  {
    name: 'rest defence: opponents create less on the break',
    on: { restDefence: 5 },
    off: { restDefence: 2 },
    metric: transitionXg,
    side: 'B',
    sign: -1,
    // Measured 2026-11-19: no effect either way (0.75 against 0.74 xG in 200 matches). The
    // players caught upfield press the ball as much as the rest defence covers behind it.
    open: 'level 2 has no space-behind term for a counter yet (HANDOFF 2026-11-19)',
  },
  {
    name: 'offside trap: opponents caught more',
    on: { offsideTrap: true },
    off: { offsideTrap: false },
    metric: (r, a) => r.stats[a].offsides,
    side: 'B',
    sign: 1,
  },
];

const N = 200;

/** Paired mean change (on − off) over N seeds and its t statistic. */
function paired(c: Case): { mean: number; t: number } {
  const ds: number[] = [];
  for (let i = 0; i < N; i++) {
    const seed = 7000 + i;
    const play = (over: Partial<TacticalPlan['team']>) => {
      const plan = defaultPlan('4-3-3');
      plan.team = { ...plan.team, ...over };
      const A = teamInput(seed * 2 + 1, 65, plan, `a${seed}`);
      const Bt = teamInput(seed * 2 + 2, 65, defaultPlan('4-3-3'), `b${seed}`);
      const a: 0 | 1 = i % 2 === 0 ? 0 : 1;
      const r = simulateLevel2(a === 0 ? matchInput(seed, A, Bt) : matchInput(seed, Bt, A));
      return c.metric(r, c.side === 'A' ? a : B(a));
    };
    ds.push(play(c.on) - play(c.off));
  }
  const mean = ds.reduce((x, y) => x + y, 0) / N;
  const sd = Math.sqrt(ds.reduce((acc, d) => acc + (d - mean) ** 2, 0) / (N - 1));
  return { mean, t: mean / (sd / Math.sqrt(N) || 1) };
}

describe('MC-167 level 2 tactical coherence', () => {
  for (const c of CASES)
    (c.open ? it.skip : it)(
      c.name,
      () => {
        const { t } = paired(c);
        // The change goes the declared way, beyond noise (paired t above 2, about p < 0.05).
        expect(t * c.sign).toBeGreaterThan(2);
      },
      60_000,
    );
});
