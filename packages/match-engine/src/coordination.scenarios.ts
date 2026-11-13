/**
 * MC-246 scenarios: team shape and collective tasks only, with the ball moved
 * by a script (used by coordination.test.ts and by calibration runs).
 */
import { ATTRIBUTES, GOALKEEPING, type Attributes, type TacticalPlan } from './contract';
import { DT } from './movement';
import { LENGTH, dist, type Vec2 } from './pitch';
import { defaultPlan } from './presets';
import { between, fork, rngFrom, type Rng } from './random';
import type { Sample } from './trajectories';
import { coordinate, createWorld, movePlayers, type World } from './world';

const BALL_SPEED = 16;
/**
 * Seconds a receiver keeps the ball. Série A teams make about 420 passes in about
 * 27 minutes of possession (02 §11): one pass every 3.9 s, flight included.
 */
const HOLD = 2.8;
/** PARAMETER: seconds a receiver inside the opponents' penalty area keeps the ball. */
const BOX_HOLD = 1;

function squad(r: Rng): Attributes[] {
  return Array.from({ length: 11 }, (_, slot) => {
    const a = Object.fromEntries(
      ATTRIBUTES.map((k) => [k, Math.round(between(r, 45, 78))]),
    ) as Attributes;
    if (slot !== 0) for (const k of GOALKEEPING) a[k] = 10;
    return a;
  });
}

export interface Scenario {
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
        // Nobody holds the ball in the opponents' box: it is shot or crossed at once.
        const box = holder.team === 0 ? holder.pos.x > LENGTH - 16.5 : holder.pos.x < 16.5;
        releaseAt = tick * DT + (box ? BOX_HOLD : sc.hold);
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
