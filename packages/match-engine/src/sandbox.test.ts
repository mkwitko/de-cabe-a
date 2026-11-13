import { describe, expect, it } from 'vitest';
import { BOX_DEPTH, CENTER, LENGTH, WIDTH, dist, flip, laneOf, zoneOf } from './pitch';
import { DT, maxSpeed, moveTowards, separate, type Mover } from './movement';
import { between, fork, next, rngFrom } from './random';
import {
  DEFAULT_INSTRUCTIONS,
  DEFENDERS,
  InstructionsSchema,
  SLOTS,
  anchor,
  type Instructions,
} from './shape';
import { createSandbox, frame, simulate, step, teamOf } from './sandbox';

const MINUTE = 60 / DT;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('random', () => {
  it('repeats for the same seed and differs for another', () => {
    const a = rngFrom(7);
    const b = rngFrom(7);
    const c = rngFrom(8);
    const seq = (r: typeof a) => Array.from({ length: 5 }, () => next(r));
    const first = seq(a);
    expect(seq(b)).toEqual(first);
    expect(seq(c)).not.toEqual(first);
    expect(first.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('forks independent streams without advancing the parent', () => {
    const r = rngFrom(1);
    const before = r.s;
    expect(next(fork(r, 'a'))).not.toBe(next(fork(r, 'b')));
    expect(next(fork(r, 'a'))).toBe(next(fork(r, 'a')));
    expect(r.s).toBe(before);
  });
});

describe('pitch', () => {
  it('flips to the team frame and back', () => {
    const v = { x: 12.5, y: 60 };
    expect(flip(0, v)).toEqual(v);
    expect(flip(1, v)).toEqual({ x: LENGTH - 12.5, y: WIDTH - 60 });
    expect(flip(1, flip(1, v))).toEqual(v);
  });

  it('maps corners to zones and lanes', () => {
    expect(zoneOf({ x: 0, y: 0 })).toEqual({ col: 0, row: 0 });
    expect(zoneOf({ x: LENGTH, y: WIDTH })).toEqual({ col: 11, row: 7 });
    expect([0, 20, 34, 50, 68].map(laneOf)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('shape', () => {
  it('keeps every anchor on the pitch for any ball and instruction', () => {
    const r = rngFrom(3);
    for (let n = 0; n < 500; n++) {
      const ball = { x: between(r, 0, LENGTH), y: between(r, 0, WIDTH) };
      const ins: Instructions = {
        width: 1 + Math.floor(next(r) * 5),
        lineHeight: 1 + Math.floor(next(r) * 5),
        inverted: (['R', 'L', null] as const)[Math.floor(next(r) * 3)]!,
      };
      for (const phase of ['in', 'out'] as const)
        for (let slot = 0; slot < SLOTS; slot++) {
          const a = anchor(slot, phase, ball, ins);
          expect(a.x).toBeGreaterThanOrEqual(1);
          expect(a.x).toBeLessThanOrEqual(LENGTH - 1);
          expect(a.y).toBeGreaterThanOrEqual(1);
          expect(a.y).toBeLessThanOrEqual(WIDTH - 1);
          if (slot === 0 && phase === 'out') expect(a.x).toBeLessThanOrEqual(BOX_DEPTH);
        }
    }
  });

  it('rejects instructions outside the schema', () => {
    expect(() => InstructionsSchema.parse({ width: 6, lineHeight: 3, inverted: null })).toThrow();
    expect(() => InstructionsSchema.parse({ ...DEFAULT_INSTRUCTIONS, cash: 1 })).toThrow();
  });
});

describe('movement', () => {
  const mover = (x: number, y: number): Mover => ({
    pos: { x, y },
    vel: { x: 0, y: 0 },
    pace: 99,
    acceleration: 99,
  });

  it('never exceeds top speed, reaches the target and stops', () => {
    const m = mover(0, 0);
    const target = { x: 40, y: 30 };
    let top = 0;
    for (let i = 0; i < 20 / DT; i++) {
      moveTowards(m, target);
      top = Math.max(top, Math.sqrt(m.vel.x ** 2 + m.vel.y ** 2));
    }
    expect(top).toBeLessThanOrEqual(maxSpeed(m) + 1e-9);
    expect(top).toBeGreaterThan(8);
    expect(dist(m.pos, target)).toBeLessThan(0.3);
    expect(Math.sqrt(m.vel.x ** 2 + m.vel.y ** 2)).toBeLessThan(0.5);
  });

  it('separates players on the same spot', () => {
    const all = [mover(10, 10), mover(10, 10), mover(10.2, 10)];
    for (let i = 0; i < 5; i++) separate(all);
    expect(dist(all[0]!.pos, all[1]!.pos)).toBeGreaterThanOrEqual(0.59);
  });
});

describe('sandbox', () => {
  it('holds its invariants for five minutes', () => {
    const s = createSandbox(42);
    const holders = new Set<number>();
    const owners = new Set<number>();
    for (let i = 0; i < 5 * MINUTE; i++) {
      step(s);
      holders.add(s.holder);
      owners.add(teamOf(s.holder));
      expect(s.players).toHaveLength(22);
      for (const p of s.players) {
        expect(Number.isFinite(p.pos.x) && Number.isFinite(p.pos.y)).toBe(true);
        expect(p.pos.x).toBeGreaterThanOrEqual(0);
        expect(p.pos.x).toBeLessThanOrEqual(LENGTH);
        expect(p.pos.y).toBeGreaterThanOrEqual(0);
        expect(p.pos.y).toBeLessThanOrEqual(WIDTH);
        expect(Math.sqrt(p.vel.x ** 2 + p.vel.y ** 2)).toBeLessThanOrEqual(maxSpeed(p) + 1e-9);
      }
      expect(s.ball.x).toBeGreaterThanOrEqual(0);
      expect(s.ball.x).toBeLessThanOrEqual(LENGTH);
    }
    expect(holders.size).toBeGreaterThan(10);
    expect(owners.size).toBe(2);
  });

  it('is deterministic, and chunks equal one run byte for byte', () => {
    const whole = simulate(createSandbox(9), 2 * MINUTE);
    expect(simulate(createSandbox(9), 2 * MINUTE)).toEqual(whole);
    expect(simulate(createSandbox(10), 2 * MINUTE)).not.toEqual(whole);

    const s = createSandbox(9);
    const first = simulate(s, 100);
    // A chunk boundary is a serialisation boundary (ADR-015).
    const resumed = JSON.parse(JSON.stringify(s)) as typeof s;
    const rest = simulate(resumed, 2 * MINUTE - 100);
    expect(JSON.stringify([...first, ...rest])).toBe(JSON.stringify(whole));
  });

  it('emits integer frames of 47 numbers', () => {
    const f = frame(createSandbox(1));
    expect(f).toHaveLength(3 + 44);
    expect(f.every(Number.isInteger)).toBe(true);
  });
});

/** Causal tests (TASKS.md MC-026): each instruction moves the metric it claims to move. */
describe('instructions', () => {
  /** Team 0 positions in its own frame, split by whether team 0 has the ball. */
  function run(ins: Partial<Instructions>, seed: number) {
    const s = createSandbox(seed, [{ ...DEFAULT_INSTRUCTIONS, ...ins }, DEFAULT_INSTRUCTIONS]);
    const spread: number[] = [];
    const lastLine: number[] = [];
    const rightBackOffCentre: number[] = [];
    for (let i = 0; i < 5 * MINUTE; i++) {
      step(s);
      if (i < MINUTE / 2) continue;
      const team = s.players.slice(0, SLOTS);
      spread.push(mean(team.slice(1).map((p) => Math.abs(p.pos.y - CENTER.y))));
      lastLine.push(mean(DEFENDERS.map((k) => team[k]!.pos.x)));
      if (teamOf(s.holder) === 0) rightBackOffCentre.push(Math.abs(team[1]!.pos.y - CENTER.y));
    }
    return {
      spread: mean(spread),
      lastLine: mean(lastLine),
      rightBackOffCentre: mean(rightBackOffCentre),
    };
  }
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
  const over = (ins: Partial<Instructions>) => seeds.map((seed) => run(ins, seed));

  it('width 5 spreads the team more than width 1, on every seed', () => {
    const narrow = over({ width: 1 });
    const wide = over({ width: 5 });
    seeds.forEach((_, i) => expect(wide[i]!.spread).toBeGreaterThan(narrow[i]!.spread + 2));
  });

  it('a high line pushes the back four up, on every seed', () => {
    const deep = over({ lineHeight: 1 });
    const high = over({ lineHeight: 5 });
    seeds.forEach((_, i) => expect(high[i]!.lastLine).toBeGreaterThan(deep[i]!.lastLine + 8));
  });

  it('an inverted right-back plays nearer the centre with the ball, and the team gets narrower', () => {
    const plain = over({});
    const inverted = over({ inverted: 'R' });
    seeds.forEach((_, i) => {
      expect(inverted[i]!.rightBackOffCentre).toBeLessThan(plain[i]!.rightBackOffCentre - 5);
      // The cost the spec promises: less width.
      expect(inverted[i]!.spread).toBeLessThan(plain[i]!.spread);
    });
  });
});
