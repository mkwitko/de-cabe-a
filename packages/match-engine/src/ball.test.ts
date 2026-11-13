import { describe, expect, it } from 'vitest';
import {
  CLOCK,
  PLAYABLE_HEIGHT,
  ROLL_DECEL,
  advanceBall,
  due,
  firstContact,
  groundPass,
  rollTime,
  type Ball,
  type Reacher,
} from './ball';
import { next, rngFrom } from './random';

const reacher = (x: number, y: number, vx = 0, vy = 0): Reacher => ({
  pos: { x, y },
  vel: { x: vx, y: vy },
  reach: 1,
  height: PLAYABLE_HEIGHT,
});

/** Steps the ball and linearly moving players until the first contact; returns it with the total time. */
function run(ball: Ball, players: Reacher[], dt: number, maxT = 8) {
  const b = { ...ball };
  const ps = players.map((p) => ({ ...p, pos: { ...p.pos } }));
  for (let t = 0; t < maxT; t += dt) {
    const c = firstContact(b, ps, dt);
    if (c) return { ...c, t: t + c.t };
    advanceBall(b, dt);
    for (const p of ps) {
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
    }
  }
  return null;
}

describe('MC-248 ball inside the step', () => {
  it('a 30 m/s ball never passes through a player or a line', () => {
    const b: Ball = { x: 50, y: 34, z: 0, vx: 30, vy: 0, vz: 0 };
    // Player 3 m ahead: the ball covers 7.5 m per step, a naive end-of-step check would miss him.
    expect(run(b, [reacher(53, 34.4)], 0.25)).toMatchObject({ kind: 'player', index: 0 });
    const c = run({ ...b, x: 100 }, [], 0.25);
    expect(c).toMatchObject({ kind: 'line', side: 'goal1' });
    expect(c!.t).toBeCloseTo(5 / 30, 1);
  });

  it('DT 0.25 and 0.1 give the same contact in 500 random passes', () => {
    const r = rngFrom(11);
    let same = 0;
    let worst = 0;
    for (let k = 0; k < 500; k++) {
      const from = { x: 20 + next(r) * 60, y: 10 + next(r) * 48 };
      const to = { x: 10 + next(r) * 85, y: 5 + next(r) * 58 };
      const ball = groundPass(from, to, 2 + next(r) * 10);
      const ps = Array.from({ length: 8 }, () =>
        reacher(5 + next(r) * 95, 3 + next(r) * 62, (next(r) - 0.5) * 8, (next(r) - 0.5) * 8),
      );
      const a = run(ball, ps, 0.25);
      const b = run(ball, ps, 0.1);
      const key = (c: ReturnType<typeof run>) =>
        c ? (c.kind === 'player' ? `p${c.index}` : c.side) : 'none';
      if (key(a) === key(b)) {
        same++;
        if (a && b) worst = Math.max(worst, Math.abs(a.t - b.t));
      }
    }
    expect(same).toBeGreaterThanOrEqual(495);
    expect(worst).toBeLessThan(0.05);
  });

  it('a ground pass arrives with the speed asked for', () => {
    const ball = groundPass({ x: 10, y: 10 }, { x: 40, y: 50 }, 6);
    const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
    const t = rollTime(speed, 50);
    advanceBall(ball, t);
    expect(ball.x).toBeCloseTo(40, 6);
    expect(ball.y).toBeCloseTo(50, 6);
    expect(Math.sqrt(ball.vx ** 2 + ball.vy ** 2)).toBeCloseTo(6, 6);
    expect(rollTime(5, (5 * 5) / (2 * ROLL_DECEL) + 1)).toBe(Infinity);
  });

  it('a wide shot is a goal kick, not a goal; a lofted ball flies over a player', () => {
    expect(run({ x: 100, y: 20, z: 0, vx: 25, vy: 0, vz: 0 }, [], 0.25)).toMatchObject({
      side: 'byline1',
    });
    const lob: Ball = { x: 40, y: 34, z: 0, vx: 18, vy: 0, vz: 12 };
    const c = run(lob, [reacher(48, 34)], 0.1);
    expect(c?.kind === 'player' && c.index === 0).toBe(false);
  });

  it('clocks: each off-ball player decides once per second, a quarter of the team per step', () => {
    for (let i = 0; i < 22; i++) {
      const ticks = [0, 1, 2, 3].filter((t) => due('offBallDecision', t, i));
      expect(ticks).toHaveLength(1);
    }
    const perTick = [0, 1, 2, 3].map(
      (t) =>
        Array.from({ length: 22 }, (_, i) => i).filter((i) => due('offBallDecision', t, i)).length,
    );
    expect(Math.max(...perTick) - Math.min(...perTick)).toBeLessThanOrEqual(1);
    expect(CLOCK.coordination * 0.25).toBe(1);
  });
});
