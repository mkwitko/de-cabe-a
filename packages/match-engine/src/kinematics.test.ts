import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { arrivalTime, kinOf, reach, travelTime, type PhysicalAttrs } from './kinematics';

const mid: PhysicalAttrs = {
  pace: 60,
  acceleration: 60,
  agility: 60,
  anticipation: 60,
  concentration: 60,
};
const at = (x: number, y: number) => ({ x, y });

/** Fujimura and Sugihara, as reported in research 11 §3: alpha 1.3, Vmax 7.8 m/s (test only: uses exp). */
function fujimuraTime(d: number) {
  let lo = 0;
  let hi = 20;
  for (let i = 0; i < 60; i++) {
    const t = (lo + hi) / 2;
    const x = 7.8 * (t - (1 - Math.exp(-1.3 * t)) / 1.3);
    if (x < d) lo = t;
    else hi = t;
  }
  return lo;
}

describe('MC-247 arrival model', () => {
  it('a fast player from rest stays within 12% of the reference curve at 5 to 40 m', () => {
    const fast = kinOf({ ...mid, pace: 50, acceleration: 75 }, at(0, 0), at(0, 0));
    expect(fast.vmax).toBeGreaterThan(7.5);
    expect(fast.vmax).toBeLessThan(8.0);
    for (const d of [5, 10, 20, 30, 40]) {
      const ours = travelTime(d, 0, fast.accel, fast.vmax);
      const ref = fujimuraTime(d);
      expect(Math.abs(ours - ref) / ref).toBeLessThan(0.12);
    }
  });

  it('mean reaction is close to the 0.7 s reference', () => {
    expect(kinOf(mid, at(0, 0), at(0, 0)).reaction).toBeCloseTo(0.65, 1);
  });

  it('reach is the inverse of travel time', () => {
    for (const d of [0.5, 3, 12, 45]) {
      const t = travelTime(d, 2, 5, 8);
      expect(reach(t, 2, 5, 8)).toBeCloseTo(d, 9);
    }
  });

  it('a slow centre-back is slower than distance over top speed says (the error the model avoids)', () => {
    const slow = kinOf({ ...mid, pace: 30, acceleration: 30 }, at(0, 0), at(0, 0));
    const naive = 15 / slow.vmax;
    expect(arrivalTime(slow, at(15, 0), true)).toBeGreaterThan(naive + 0.5);
  });

  it('running away from the target costs a turn; running at it saves time', () => {
    const towards = kinOf(mid, at(0, 0), at(6, 0));
    const away = kinOf(mid, at(0, 0), at(-6, 0));
    const still = kinOf(mid, at(0, 0), at(0, 0));
    const p = at(20, 0);
    expect(arrivalTime(towards, p)).toBeLessThan(arrivalTime(still, p));
    expect(arrivalTime(away, p)).toBeGreaterThan(arrivalTime(still, p) + 0.3);
  });

  it('anticipation cuts reaction; fatigue below 0.3 slows the run', () => {
    const sharp = kinOf({ ...mid, anticipation: 95, concentration: 95 }, at(0, 0), at(0, 0));
    const dull = kinOf({ ...mid, anticipation: 20, concentration: 20 }, at(0, 0), at(0, 0));
    expect(sharp.reaction).toBeLessThan(dull.reaction - 0.3);
    const tired = kinOf(mid, at(0, 0), at(0, 0), 0.1);
    expect(arrivalTime(tired, at(30, 0))).toBeGreaterThan(arrivalTime(sharp, at(30, 0)));
  });

  it('no arrival estimate by distance over top speed anywhere else in the engine', () => {
    const dir = fileURLToPath(new URL('.', import.meta.url));
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'kinematics.ts')
      .filter((f) => /\/\s*(vmax|maxSpeed\(|topSpeed\()/.test(readFileSync(dir + f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
