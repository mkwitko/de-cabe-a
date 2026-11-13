/**
 * MC-246: coordination proof. Team shape and collective tasks only, with the
 * ball moved by a script, in six fixed scenarios and eight seeds each.
 * T1, T2, T3, T5 and T9 must stay inside BANDS (02-MATCH-ENGINE.md §5.11).
 */
import { describe, expect, it } from 'vitest';
import { ATTRIBUTES, GOALKEEPING, type Attributes, type TacticalPlan } from './contract';
import { DT } from './movement';
import { dist, type Vec2 } from './pitch';
import { defaultPlan } from './presets';
import { between, fork, rngFrom, type Rng } from './random';
import { BANDS, t1, t2, t3, t5, t9, type Sample } from './trajectories';
import { coordinate, createWorld, movePlayers, type World } from './world';

const BALL_SPEED = 16;
/**
 * Seconds a receiver keeps the ball. Série A teams make about 420 passes in about
 * 27 minutes of possession (02 §11): one pass every 3.9 s, flight included.
 */
const HOLD = 2.8;

function squad(r: Rng): Attributes[] {
  return Array.from({ length: 11 }, (_, slot) => {
    const a = Object.fromEntries(
      ATTRIBUTES.map((k) => [k, Math.round(between(r, 45, 78))]),
    ) as Attributes;
    if (slot !== 0) for (const k of GOALKEEPING) a[k] = 10;
    return a;
  });
}

interface Scenario {
  name: string;
  plans: [TacticalPlan, TacticalPlan];
  /** Receivers in order as world indices (0..10 team 0, 11..21 team 1); the list repeats. */
  script: number[];
  /** Seconds each receiver keeps the ball. */
  hold: number;
}

function plan(f: string, team: Partial<TacticalPlan['team']>): TacticalPlan {
  const p = defaultPlan(f);
  p.team = { ...p.team, ...team };
  return p;
}

const T1 = (slot: number) => 11 + slot;
export const SCENARIOS: Scenario[] = [
  {
    name: 'S1 short build-up under a high press',
    plans: [plan('4-3-3', {}), plan('4-4-2', { block: 'high', pressIntensity: 5, lineHeight: 4 })],
    script: [0, 2, 5, 3, 4, 7, 3, 2, 1, 6, 5, 2],
    hold: HOLD,
  },
  {
    name: 'S2 right-back overlaps, midfield covers',
    plans: [plan('4-3-3', { restDefence: 3 }), plan('4-2-3-1', {})],
    script: [5, 6, 8, 1, 8, 6, 1, 9, 6, 5, 2, 5],
    hold: HOLD,
  },
  {
    name: 'S3 low block around the box',
    plans: [plan('4-4-2', { block: 'low', pressIntensity: 2 }), plan('4-3-3', { lineHeight: 4 })],
    script: [T1(6), T1(8), T1(1), T1(6), T1(7), T1(10), T1(4), T1(7), T1(9), T1(6)],
    hold: HOLD,
  },
  {
    name: 'S4 losing the ball with five ahead of it',
    plans: [plan('4-3-3', { restDefence: 3 }), plan('4-2-3-1', { onWin: 'counter' })],
    script: [5, 6, 8, 9, 7, T1(5), T1(8), T1(10), 3, 5, 7, 10, 6, T1(6), T1(7), T1(9), 2, 5],
    hold: HOLD,
  },
  {
    name: 'S5 switching play',
    plans: [plan('4-2-3-1', { width: 5 }), plan('4-4-2', { compactness: 4 })],
    script: [3, 4, 9, 5, 6, 1, 7, 6, 2, 3, 4, 8],
    hold: HOLD,
  },
  {
    name: 'S6 long ball behind a high line',
    plans: [plan('4-3-3', {}), plan('4-3-3', { lineHeight: 5, block: 'high', pressIntensity: 4 })],
    script: [0, 2, 0, 9, 6, 5, 2, 0, 10, 7, 3],
    hold: HOLD,
  },
];

/** Plays a scenario for `seconds` and returns the samples. */
export function play(sc: Scenario, seed: number, seconds = 120) {
  const r = rngFrom(seed);
  const w: World = createWorld(r, [
    { plan: sc.plans[0], attrs: squad(fork(r, 'a')) },
    { plan: sc.plans[1], attrs: squad(fork(r, 'b')) },
  ]);
  let k = 0;
  const first = sc.script[0]!;
  w.ball.holder = first;
  w.ball.possession = first < 11 ? 0 : 1;
  w.ball.pos = { ...w.players[first]!.pos };
  w.ball.focal = { ...w.ball.pos };
  let flight: { from: Vec2; travelled: number } | null = null;
  let releaseAt = sc.hold;
  const samples: Sample[] = [];
  const intents: string[][] = [];
  let event = true;
  for (let tick = 0; tick * DT < seconds; tick++) {
    w.tick = tick;
    const holder = w.players[w.ball.holder!]!;
    if (flight) {
      flight.travelled += BALL_SPEED * DT;
      const d = dist(flight.from, holder.pos);
      if (flight.travelled >= d) {
        flight = null;
        w.ball.pos = { ...holder.pos };
        releaseAt = tick * DT + sc.hold;
      } else {
        const f = flight.travelled / d;
        w.ball.pos = {
          x: flight.from.x + (holder.pos.x - flight.from.x) * f,
          y: flight.from.y + (holder.pos.y - flight.from.y) * f,
        };
      }
      w.ball.focal = { ...holder.pos };
    } else {
      w.ball.pos = { ...holder.pos };
      w.ball.focal = { ...holder.pos };
      if (tick * DT >= releaseAt) {
        k = (k + 1) % sc.script.length;
        const to = sc.script[k]!;
        const team = to < 11 ? 0 : 1;
        event = team !== w.ball.possession;
        flight = { from: { ...w.ball.pos }, travelled: 0 };
        w.ball.holder = to;
        w.ball.possession = team;
        w.ball.focal = { ...w.players[to]!.pos };
      }
    }
    coordinate(w, 0, event);
    coordinate(w, 1, event);
    event = false;
    movePlayers(w);
    samples.push({
      t: tick * DT,
      ball: { ...w.ball.pos },
      possession: w.ball.possession,
      holder: w.ball.holder,
      inFlight: flight !== null,
      players: w.players.map((p) => ({ ...p.pos })),
    });
    intents.push(w.players.map((p) => p.intent));
  }
  return { w, samples: samples.slice(20), intents: intents.slice(20) }; // first 5 s settle from the kick-off spots
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

describe('MC-246 coordination proof', () => {
  for (const sc of SCENARIOS) {
    it(sc.name, () => {
      const report: string[] = [];
      const losses: [number[], number[]] = [[], []];
      const guard: [[number, number], [number, number]] = [
        [0, 0],
        [0, 0],
      ];
      for (const seed of SEEDS) {
        const { w, samples } = play(sc, seed, 240);
        for (const team of [0, 1] as const) {
          const a = t1(samples, team);
          const b = t2(samples, team, sc.plans[team].roles, sc.plans[team].shapes.outOfPossession);
          const c = t3(samples, team, DT);
          const d = t5(samples, team);
          const fail = [
            a.mean > BANDS.T1mean && `T1 mean ${a.mean.toFixed(2)}`,
            a.max > BANDS.T1max && `T1 max ${a.max}`,
            a.maxInBox > BANDS.T1maxInBox && `T1 box max ${a.maxInBox}`,
            b.backGapP95 > BANDS.T2backGapP95 && `T2 back gap ${b.backGapP95.toFixed(1)}`,
            b.betweenLinesP95 > BANDS.T2betweenLinesP95[sc.plans[team].team.block] &&
              `T2 lines ${b.betweenLinesP95.toFixed(1)}`,
            c.per10min > BANDS.T3per10min && `T3 ${c.per10min.toFixed(2)}`,
          ].filter(Boolean);
          if (fail.length)
            report.push(`${sc.name.slice(0, 2)} seed ${seed} team ${team}: ${fail.join(', ')}`);
          losses[team].push(...t9(samples, team).counts);
          guard[team][0] += d.samples;
          guard[team][1] += d.emptyShare * d.samples;
        }
        expect(w.log.length).toBeGreaterThan(0);
      }
      // T5 as a share of all eight seeds' time (a single short episode in one seed is noise).
      for (const team of [0, 1] as const) {
        const [n, empty] = guard[team];
        if (n > 0 && empty / n > BANDS.T5emptyShare)
          report.push(`${sc.name.slice(0, 2)} team ${team}: T5 ${(empty / n).toFixed(2)} of ${n}`);
      }
      // T9 on the mean over all losses of the eight seeds (02 §5.9: "na média").
      for (const team of [0, 1] as const) {
        const xs = losses[team];
        if (xs.length < 5) continue;
        const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
        const want = sc.plans[team].team.restDefence;
        if (Math.abs(mean - want) > BANDS.T9tolerance)
          report.push(
            `${sc.name.slice(0, 2)} team ${team}: T9 ${mean.toFixed(2)} vs ${want} (${xs.length} losses)`,
          );
      }
      expect(report).toEqual([]);
    });
  }

  it('T9 is measured: S4 has losses in the opponents half', () => {
    const { samples } = play(SCENARIOS[3]!, 1, 240);
    expect(t9(samples, 0).losses).toBeGreaterThan(2);
  });

  it('tasks show up in the log with their kinds', () => {
    const { w } = play(SCENARIOS[1]!, 1, 30);
    const kinds = new Set(w.log.map((l) => l.task));
    for (const k of ['press', 'restDefence', 'support', 'mark'] as const)
      expect(kinds).toContain(k);
  });

  it('is deterministic', () => {
    const a = play(SCENARIOS[0]!, 3, 30).samples;
    const b = play(SCENARIOS[0]!, 3, 30).samples;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
