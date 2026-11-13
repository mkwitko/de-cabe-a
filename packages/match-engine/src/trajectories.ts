/**
 * Movement plausibility metrics over sampled frames (TEST_STRATEGY.md §4.1;
 * MC-246 uses T1, T2, T3, T5, T9; MC-203 adds the rest).
 * PARAMETERS: the bands in `BANDS` are design limits, declared in
 * 02-MATCH-ENGINE.md §5.11; no published band exists for T1 to T5 and T9.
 */
import type { RoleId } from './contract';
import { LENGTH, flip, type Vec2 } from './pitch';
import { lineOf } from './team';

export interface Sample {
  t: number; // seconds
  ball: Vec2; // world frame
  possession: 0 | 1 | null;
  holder: number | null;
  inFlight: boolean;
  players: Vec2[]; // world frame, index = world index
}

export interface Squad {
  roles: [RoleId[], RoleId[]];
  restDefence: [number, number];
}

export const BANDS = {
  T1mean: 1.5,
  T1max: 3,
  T1maxInBox: 4,
  T2backGapP95: 22,
  /** Between back and midfield lines, by block: a high press stretches it (context cell). */
  T2betweenLinesP95: { low: 22, mid: 22, high: 30 },
  T3per10min: 1,
  T5emptyShare: 0.1,
  T9tolerance: 1,
} as const;

/**
 * Seconds of transition after a change of possession, measured apart (MC-257).
 * PARAMETER: covers a counter-attack of three quick passes.
 */
export const TRANSITION = 8;

/** Marks samples that belong to the transition cell. */
export function inTransition(samples: Sample[]): boolean[] {
  let last = -Infinity;
  return samples.map((s, k) => {
    if (k > 0 && s.possession !== samples[k - 1]!.possession) last = s.t;
    return s.t - last < TRANSITION;
  });
}

const inTeam = (team: 0 | 1) => (i: number) => (team === 0 ? i < 11 : i >= 11);
const p95 = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(0.95 * s.length))]!;
};

/**
 * A swarm is players gathering, not a runner crossing the ball's area: T1's max
 * counts players that stay within 5 m for this long. PARAMETER.
 */
export const SWARM_HOLD = 1;

/**
 * T1: teammates (not the holder) within 5 m of the ball; mean and max per team,
 * with the ball outside both penalty areas, and the max inside them (context cells, §4.1).
 * The max is the largest count held for SWARM_HOLD seconds.
 */
export function t1(samples: Sample[], team: 0 | 1, dt: number) {
  let sum = 0;
  let count = 0;
  const near = samples.map((s) => {
    let n = 0;
    s.players.forEach((p, i) => {
      if (!inTeam(team)(i) || i === s.holder || i % 11 === 0) return; // the keeper is not a swarm
      const dx = p.x - s.ball.x;
      const dy = p.y - s.ball.y;
      if (dx * dx + dy * dy < 25) n++;
    });
    return n;
  });
  const inBox = (s: Sample) => s.ball.x < 16.5 || s.ball.x > LENGTH - 16.5;
  for (const [k, s] of samples.entries()) {
    if (inBox(s)) continue;
    count++;
    sum += near[k]!;
  }
  const w = Math.max(1, Math.round(SWARM_HOLD / dt));
  let max = 0;
  let maxInBox = 0;
  for (let k = 0; k + w <= samples.length; k++) {
    let held = Infinity;
    for (let j = k; j < k + w; j++) held = Math.min(held, near[j]!);
    if (inBox(samples[k]!)) maxInBox = Math.max(maxInBox, held);
    else max = Math.max(max, held);
  }
  return { mean: count ? sum / count : 0, max, maxInBox };
}

/** T2: gaps between neighbours of the back line and between back and midfield lines, out of possession. */
export function t2(samples: Sample[], team: 0 | 1, roles: RoleId[], shape: Vec2[]) {
  // Lines by where the plan puts each slot without the ball: back line x ≤ 30, midfield up to 42.
  const def = roles.map((r, slot) => ({ r, slot })).filter((x) => lineOf(x.r) === 'def');
  const mid = roles
    .map((r, slot) => ({ r, slot }))
    .filter((x) => lineOf(x.r) !== 'gk' && lineOf(x.r) !== 'def' && shape[x.slot]!.x <= 42);
  const gaps: number[] = [];
  const between: number[] = [];
  const tr = inTransition(samples);
  for (const [k, s] of samples.entries()) {
    if (s.possession === team || tr[k]) continue;
    const at = (slot: number) => flip(team, s.players[team * 11 + slot]!);
    // Players engaging the ball (within 10 m) are out of the line on purpose; the line is the rest.
    const ballT = flip(team, s.ball);
    // With the ball in our box there is no line to keep: that is box defence, its own context cell (§4.1).
    if (ballT.x < 16.5) continue;
    const holding = (slot: number) => {
      const p = at(slot);
      return (p.x - ballT.x) ** 2 + (p.y - ballT.y) ** 2 >= 100;
    };
    const ys = def
      .filter((d) => holding(d.slot))
      .map((d) => at(d.slot))
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < ys.length; i++) {
      const dx = ys[i]!.x - ys[i - 1]!.x;
      const dy = ys[i]!.y - ys[i - 1]!.y;
      gaps.push(Math.sqrt(dx * dx + dy * dy));
    }
    const mean = (xs: Vec2[]) => xs.reduce((a, p) => a + p.x, 0) / xs.length;
    // The midfield line is the midfielders between the ball and our goal: one still on the
    // far side of the ball is recovering (transition cell, MC-257), not part of the line.
    const midIn = mid.filter((m) => holding(m.slot) && at(m.slot).x <= ballT.x);
    const defIn = def.filter((d) => holding(d.slot));
    if (midIn.length && defIn.length)
      between.push(mean(midIn.map((m) => at(m.slot))) - mean(defIn.map((d) => at(d.slot))));
  }
  return { backGapP95: p95(gaps), betweenLinesP95: p95(between) };
}

/** T3: episodes of two teammates within 2 m for more than 3 s, outside both boxes, per 10 minutes. */
export function t3(samples: Sample[], team: 0 | 1, dt: number) {
  const run = new Map<string, number>();
  let episodes = 0;
  const outsideBoxes = (p: Vec2) => p.x > 16.5 && p.x < LENGTH - 16.5;
  for (const s of samples) {
    const seen = new Set<string>();
    for (let i = team * 11; i < team * 11 + 11; i++)
      for (let j = i + 1; j < team * 11 + 11; j++) {
        const a = s.players[i]!;
        const b = s.players[j]!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if (dx * dx + dy * dy >= 4 || !outsideBoxes(a)) continue;
        const k = `${i}-${j}`;
        seen.add(k);
        const len = (run.get(k) ?? 0) + dt;
        run.set(k, len);
        if (len > 3 && len - dt <= 3) episodes++;
      }
    for (const k of [...run.keys()]) if (!seen.has(k)) run.delete(k);
  }
  const minutes = (samples.length * dt) / 60;
  return { per10min: (episodes * 10) / Math.max(minutes, 1e-9) };
}

/** T5: share of time the zone in front of our box is empty while the opponents have the ball in our third. */
export function t5(samples: Sample[], team: 0 | 1) {
  let n = 0;
  let empty = 0;
  const tr = inTransition(samples);
  for (const [k, s] of samples.entries()) {
    if (s.possession === null || s.possession === team || tr[k]) continue;
    const ball = flip(team, s.ball);
    if (ball.x >= 35) continue;
    n++;
    let occupied = false;
    for (let slot = 1; slot < 11; slot++) {
      const p = flip(team, s.players[team * 11 + slot]!);
      if (p.x >= 16.5 && p.x <= 30 && p.y >= 20 && p.y <= 48) occupied = true;
    }
    if (!occupied) empty++;
  }
  return { samples: n, emptyShare: n === 0 ? 0 : empty / n };
}

/**
 * T9: outfield players clearly behind the ball (more than 12 m, i.e. not part of
 * the attack) at each loss of the ball in the opponents' half, after an
 * established attack there: the ball held in that half for at least TRANSITION
 * seconds. A counter lost on its first pass forward is the transition cell, not
 * the rest defence the plan sets up (§4.1, context by phase).
 */
export function t9(samples: Sample[], team: 0 | 1) {
  const counts: number[] = [];
  let since = Infinity;
  for (let k = 1; k < samples.length; k++) {
    const a = samples[k - 1]!;
    const b = samples[k]!;
    const ahead = a.possession === team && flip(team, a.ball).x > LENGTH / 2;
    if (!ahead) since = Infinity;
    else if (since === Infinity) since = a.t;
    if (a.possession !== team || b.possession === team || b.possession === null) continue;
    const ball = flip(team, a.ball);
    if (ball.x <= LENGTH / 2 || a.t - since < TRANSITION) continue;
    let n = 0;
    for (let slot = 1; slot < 11; slot++)
      if (flip(team, a.players[team * 11 + slot]!).x < ball.x - 12) n++;
    counts.push(n);
  }
  return {
    counts,
    losses: counts.length,
    mean: counts.length ? counts.reduce((x, y) => x + y, 0) / counts.length : NaN,
  };
}
