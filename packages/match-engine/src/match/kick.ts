/**
 * Execution of a kick (MC-035, MC-038; 02 §6, §7): the intention becomes a ball
 * velocity with an execution error. A shot's outcome follows 02 §7: xG is the
 * chance; finishing, composure and the keeper shift conversion by construction,
 * and the ball is then sent where that outcome puts it (wide, saved or in).
 */
import { GRAVITY, groundPass, type Ball } from '../ball';
import { pressResistance, weighted } from '../rules/duel';
import { gaussian } from '../rules/math';
import { CENTER, LENGTH, WIDTH, clamp, flip, type Vec2 } from '../pitch';
import { next } from '../random';
import { lineOf } from '../team';
import { groundSpeed, opponents, pressureOn } from './control';
import { emit } from './events';
import type { Action } from './carrier';
import type { Flight, MatchPlayer, MatchState } from './state';

const g = (s: MatchState) => gaussian(() => next(s.rngs.execution));

/**
 * Home advantage (02 §11: about 47.6% home wins; without a crowd it shrinks by a
 * sixth to a third, never to zero): the home side executes a little better.
 * PARAMETERS: base and crowd share.
 */
export const homeEdge = (s: MatchState, team: 0 | 1) =>
  team === 0 ? 0.08 + 0.14 * s.input.conditions.crowd : 0;

/** Rotates (vx, vy) by a small angle θ and renormalises (no trigonometry). */
function turn(vx: number, vy: number, theta: number): [number, number] {
  const nx = vx - theta * vy;
  const ny = vy + theta * vx;
  const k = Math.sqrt(vx * vx + vy * vy) / Math.sqrt(nx * nx + ny * ny);
  return [nx * k, ny * k];
}

/** Angular error of a pass in radians (PARAMETERS). */
/**
 * About a quarter of kicks fall to the weaker foot (ADR-019): the error grows
 * by how weak that foot is. Two-footed players have no weaker side. PARAMETER.
 */
export function footFactor(s: MatchState, c: MatchPlayer): number {
  if (c.input.preferredFoot === 'both' || next(s.rngs.execution) > 0.25) return 1;
  return 1 + 0.8 * (1 - c.attrs.weakFoot / 99);
}

export function passError(s: MatchState, c: MatchPlayer, d: number): number {
  const skill = weighted(c.attrs, { passing: 0.6, technique: 0.25, composure: 0.15 });
  const sigma =
    (0.012 +
      0.05 * (1 - skill) +
      0.04 * pressureOn(s, c) * (1.3 - pressResistance(c.attrs)) +
      0.0006 * d +
      0.03 * (1 - c.stamina)) *
    (1 - homeEdge(s, c.team));
  return g(s) * sigma * footFactor(s, c);
}

function lofted(from: Vec2, to: Vec2, h: number): Ball {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const t = d / h;
  return {
    x: from.x,
    y: from.y,
    z: 0.1,
    vx: (dx / d) * h,
    vy: (dy / d) * h,
    vz: (GRAVITY * t) / 2,
  };
}

/** Offside positions when a team-mate of `c` plays the ball (02 §6.5): in the opponents' half, ahead of ball and second-last opponent. */
export function offsideNow(s: MatchState, c: MatchPlayer): number[] {
  const ball = flip(c.team, c.pos);
  const opp = opponents(s, c.team)
    .map((o) => flip(c.team, o.pos).x)
    .sort((a, b) => b - a);
  const second = opp[1] ?? LENGTH;
  return s.players
    .filter((p) => p.active && p.team === c.team && p.index !== c.index)
    .filter((p) => {
      const x = flip(c.team, p.pos).x;
      return x > LENGTH / 2 && x > ball.x && x > second + 0.05;
    })
    .map((p) => p.index);
}

/**
 * Opponents touching the kicker but not in front of the kick cannot block it at
 * the moment it leaves the foot: the ball starts inside their reach only
 * because the reach is a disc (PARAMETER: in front = within about 45°).
 */
function beside(s: MatchState, c: MatchPlayer, ux: number, uy: number): number[] {
  return opponents(s, c.team)
    .filter((o) => {
      const dx = o.pos.x - c.pos.x;
      const dy = o.pos.y - c.pos.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= 1.6) return false;
      if (d < 1e-6 || (dx * ux + dy * uy) / d < 0.7) return true;
      // In front of the kick: a leg gets to it only part of the time (PARAMETER, anticipation helps).
      // A press-resistant passer disguises it; a drilled presser reads it (research 13 §2).
      const block = (0.2 + 0.2 * (o.attrs.anticipation / 99)) * (1.45 - pressResistance(c.attrs));
      return next(s.rngs.execution) > block;
    })
    .map((o) => o.index);
}

export function kick(s: MatchState, c: MatchPlayer, a: Action, noOffside: boolean): Flight {
  const from = { ...c.pos };
  // Lead a moving receiver: aim where he will be when the ball arrives (at most 1.5 s ahead).
  if ((a.kind === 'pass' || a.kind === 'long') && a.receiver) {
    const r = a.receiver;
    const d0 = Math.sqrt((r.pos.x - from.x) ** 2 + (r.pos.y - from.y) ** 2);
    const lead = Math.min(1.5, d0 / (a.kind === 'long' ? 18 : 14));
    a.target = {
      x: clamp(r.pos.x + r.vel.x * lead, 0.5, LENGTH - 0.5),
      y: clamp(r.pos.y + r.vel.y * lead, 0.5, WIDTH - 0.5),
    };
  }
  const dx = a.target.x - from.x;
  const dy = a.target.y - from.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const team = c.team;
  const offside = noOffside ? [] : offsideNow(s, c);
  let ball: Ball;
  let kind: Flight['kind'] = 'pass';
  let blocked = -1;
  if (a.kind === 'pass' || a.kind === 'through') {
    const spd = groundSpeed(d) * (a.kind === 'through' ? 0.95 : 1) * (1 + 0.06 * g(s));
    const target = { x: from.x + (dx / d) * d, y: from.y + (dy / d) * d };
    ball = groundPass(from, target, 1);
    const v = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) || 1;
    [ball.vx, ball.vy] = turn((ball.vx / v) * spd, (ball.vy / v) * spd, passError(s, c, d));
  } else if (a.kind === 'long' || a.kind === 'over' || a.kind === 'cross' || a.kind === 'clear') {
    kind = a.kind === 'long' || a.kind === 'over' ? 'pass' : a.kind;
    const skill =
      a.kind === 'cross'
        ? weighted(c.attrs, { crossing: 0.6, technique: 0.2, longPassing: 0.2 })
        : weighted(c.attrs, { longPassing: 0.6, technique: 0.25, passing: 0.15 });
    // Landing error grows with distance and falls with skill (PARAMETERS).
    const err =
      (0.06 + 0.12 * (1 - skill) + 0.04 * pressureOn(s, c)) * d * (a.kind === 'clear' ? 2 : 1);
    const land = {
      x: clamp(a.target.x + g(s) * err * 0.6, 0.5, LENGTH - 0.5),
      y: clamp(a.target.y + g(s) * err * 0.6, 0.5, WIDTH - 0.5),
    };
    ball = lofted(from, land, a.kind === 'cross' ? 17 : 15 + 0.12 * d);
  } else {
    // Shot.
    return shoot(s, c, a, offside);
  }
  if (kind === 'pass') {
    s.teams[team].stats.passes++;
    emit(s, 'pass', team, c.index, a.receiver?.index ?? null, from, {
      d: Math.round(d),
      p: Math.round(a.p * 100),
      chosen: Math.round(a.u * 1000),
      kind: ['pass', 'through', 'long', 'cross', 'clear', 'over'].indexOf(a.kind),
      pr: Math.round(pressureOn(s, c) * 10),
    });
  } else if (kind === 'cross') {
    emit(s, 'pass', team, c.index, null, from, { d: Math.round(d), cross: 1 });
    // A defender closing the crosser blocks it, often behind (PARAMETER).
    const closer = opponents(s, team).find(
      (o) => Math.sqrt((o.pos.x - from.x) ** 2 + (o.pos.y - from.y) ** 2) < 2.5,
    );
    if (closer && next(s.rngs.execution) < 0.58) blocked = closer.index;
  }
  return {
    ball,
    from: c.index,
    to: a.receiver?.index ?? null,
    kind,
    skip: [c.index, ...beside(s, c, dx / d, dy / d)],
    offside,
    beaten: false,
    shot: null,
    blocked,
  };
}

/** Finishing and composure shift conversion by −25%..+25% between 40 and 90 (02 §7). PARAMETER. */
export const finisherFactor = (c: MatchPlayer, header: boolean, far = false) =>
  1 +
  (header
    ? weighted(c.attrs, { heading: 0.6, jumping: 0.2, composure: 0.2 })
    : far
      ? weighted(c.attrs, { longShots: 0.6, technique: 0.25, composure: 0.15 })
      : weighted(c.attrs, { finishing: 0.6, composure: 0.25, technique: 0.15 })) -
  0.65;

export const keeperFactor = (k: MatchPlayer | undefined) =>
  k
    ? 1 -
      0.8 *
        (weighted(k.attrs, { reflexes: 0.4, handling: 0.2, oneOnOne: 0.2, gkPositioning: 0.2 }) -
          0.65)
    : 1.6;

export function shoot(
  s: MatchState,
  c: MatchPlayer,
  a: Action,
  offside: number[],
  opts: { header?: boolean; penalty?: boolean; chance?: number } = {},
): Flight {
  const team = c.team;
  const header = opts.header ?? false;
  const chance = opts.chance ?? a.chance ?? 0.05;
  const keeper = opponents(s, team).find((p) => lineOf(p.role) === 'gk');
  const pGoal = clamp(
    chance *
      finisherFactor(c, header, flip(team, c.pos).x < LENGTH - 18) *
      (header ? 1 : 1 / footFactor(s, c)) *
      keeperFactor(keeper) *
      (1 + homeEdge(s, team) - homeEdge(s, team === 0 ? 1 : 0)),
    0.002,
    0.97,
  );
  const skill = header
    ? weighted(c.attrs, { heading: 0.7, jumping: 0.3 })
    : weighted(c.attrs, { finishing: 0.6, technique: 0.4 });
  // On target (PARAMETERS): a third of shots on average (02 §11).
  const pOn = opts.penalty
    ? 0.92
    : clamp(
        Math.max(pGoal + 0.04, 0.28 + 0.3 * (skill - 0.6) - 0.08 * pressureOn(s, c) + 0.6 * chance),
        0,
        0.98,
      );
  const onTarget = next(s.rngs.execution) < pOn;
  const goal = onTarget && next(s.rngs.execution) < pGoal / pOn;
  const me = flip(team, c.pos);
  // Where the ball goes, in the team frame.
  const side = next(s.rngs.execution) < 0.5 ? -1 : 1;
  let aim: Vec2;
  if (!onTarget)
    aim = { x: LENGTH + 0.2, y: CENTER.y + side * (3.66 + 0.5 + 3 * next(s.rngs.execution)) };
  else
    aim = {
      x: LENGTH + 0.2,
      y:
        CENTER.y +
        side * (goal ? 1.5 + 1.9 * next(s.rngs.execution) : 2.5 * next(s.rngs.execution)),
    };
  const target = flip(team, aim);
  const from = { ...c.pos };
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const spd = opts.penalty
    ? 24
    : header
      ? 13
      : 19 + 8 * weighted(c.attrs, { finishing: 0.5, technique: 0.5 });
  const ball: Ball = {
    x: from.x,
    y: from.y,
    z: header ? 2 : 0.2,
    vx: (dx / d) * spd,
    vy: (dy / d) * spd,
    vz: header ? -0.5 : 1 + 2 * next(s.rngs.execution),
  };
  const st = s.teams[team].stats;
  st.shots++;
  st.xg += chance;
  if (onTarget) st.shotsOnTarget++;
  const ev = emit(s, 'shot', team, c.index, null, from, {
    xg: Math.round(chance * 1000) / 1000,
    psxg: Math.round((onTarget ? pGoal / pOn : 0) * 1000) / 1000,
    onTarget: onTarget ? 1 : 0,
    header: header ? 1 : 0,
    penalty: opts.penalty ? 1 : 0,
    x: Math.round(me.x),
    decided: goal ? 1 : 0,
  });
  return {
    ball,
    from: c.index,
    to: null,
    kind: 'shot',
    skip: [c.index],
    offside,
    beaten: goal || !onTarget,
    shot: { xg: chance, event: ev },
  };
}
