/**
 * Action with the ball (MC-034; 02 §5.4, §5.6, §5.7). The carrier lists the
 * actions he perceives, scores each one as
 *   U = P(success) × V(success) − (1 − P) × V_opp(failure) + bias
 * with his own (noisy) estimate of P, and picks by softmax. The true P and the
 * best true utility are kept so the log can tell a bad choice from a bad kick.
 */
import { exp, gaussian } from '../rules/math';
import { contest, norm, weighted } from '../rules/duel';
import { valueAt } from '../rules/value';
import { goalAngle, xg as chanceOf } from '../rules/xg';
import { CENTER, LENGTH, WIDTH, clamp, flip, type Vec2 } from '../pitch';
import { next, type Rng } from '../random';
import { lineOf } from '../team';
import { groundSpeed, kin, opponents, passSafety, pressureOn, mates } from './control';
import { arrivalTime } from '../kinematics';
import type { MatchPlayer, MatchState } from './state';

export type ActionKind = 'pass' | 'through' | 'long' | 'cross' | 'shot' | 'carry' | 'dribble' | 'hold' | 'clear';

export interface Action {
  kind: ActionKind;
  /** World-frame target point. */
  target: Vec2;
  receiver: MatchPlayer | null;
  /** True chance of success and the carrier's estimate of it. */
  p: number;
  est: number;
  /** Utility with the true chance, and with the estimate (what he chose by). */
  u: number;
  ue: number;
  /** xG of a shot from here. */
  chance?: number | undefined;
}

export interface Choice {
  action: Action;
  /** Best true utility among perceived actions, for the decision-error flag. */
  best: number;
}

/** What the restart allows: a throw-in cannot be a shot; a corner is a cross. */
export type Allowed = 'open' | 'throwIn' | 'corner' | 'goalKick' | 'freeKick' | 'kickOff' | 'keeper';

const toTeam = (p: MatchPlayer, v: Vec2) => flip(p.team, v);
/**
 * A shot ends the move: players keep the ball unless the chance beats what the
 * move is still worth by this margin. PARAMETER calibrated on shots per match (02 §11).
 */
const SHOT_RESERVE = -0.025;
/** Share of lofted balls that survive the landing, the bounce and the control. PARAMETER (long-ball completion, 02 §11). */
const LOFT_RISK = 0.7;
const oppValue = (t: Vec2) => valueAt(LENGTH - t.x, WIDTH - t.y);

/** Pressure on the shooter for xG: nearest opponent between him and goal. */
function shotContext(s: MatchState, c: MatchPlayer, header: boolean, afterCross: boolean) {
  const me = toTeam(c, c.pos);
  const gk = opponents(s, c.team).find((p) => lineOf(p.role) === 'gk');
  let keeperOut = 0;
  if (gk) {
    const g = toTeam(c, gk.pos);
    // Distance of the keeper from the line ball → goal centre, relative to 3 m.
    const ax = LENGTH - me.x;
    const ay = CENTER.y - me.y;
    const l = Math.sqrt(ax * ax + ay * ay) || 1;
    const off = Math.abs((g.x - me.x) * ay - (g.y - me.y) * ax) / l;
    keeperOut = clamp((off - 1) / 3, 0, 1);
  }
  return {
    x: me.x,
    y: me.y,
    header,
    pressure: pressureOn(s, c),
    keeperOut,
    afterCross,
    counter: s.tick - s.possessionSince < 40 && me.x > 70,
    directFreeKick: false,
  };
}

export function chanceFrom(s: MatchState, c: MatchPlayer, header = false, afterCross = false) {
  return chanceOf(shotContext(s, c, header, afterCross));
}

/** Seconds a receiver takes to settle the ball before the next decision (tempo, first touch). */
export function settleTime(s: MatchState, c: MatchPlayer): number {
  const tempo = s.plans[c.team].team.tempo;
  return 0.5 + 0.18 * (5 - tempo) + 0.5 * (1 - norm(c.attrs.firstTouch));
}

export function chooseAction(s: MatchState, c: MatchPlayer, allowed: Allowed = 'open'): Choice {
  const plan = s.plans[c.team].team;
  const r = s.rngs.decision;
  const me = toTeam(c, c.pos);
  const pressure = pressureOn(s, c);
  const decisions = norm(c.attrs.decisions);
  const vision = norm(c.attrs.vision);
  // Facing: where he runs, or towards goal when still.
  const sp = Math.sqrt(c.vel.x * c.vel.x + c.vel.y * c.vel.y);
  const face = sp > 0.5 ? { x: c.vel.x / sp, y: c.vel.y / sp } : { x: c.team === 0 ? 1 : -1, y: 0 };
  // Risk shifts the weight of losing the ball (02 §5.4); 1 careful, 5 bold.
  // Near our own goal nobody gambles (PARAMETER: up to 2.5 times the weight in our box).
  const lossW = (1.4 - 0.2 * (plan.risk - 1)) * (1 + 1.5 * clamp((30 - me.x) / 20, 0, 1));
  const noise = 0.14 * (1.15 - decisions);
  const out: Action[] = [];
  const push = (a: Omit<Action, 'est' | 'u' | 'ue'> & { win: number; lose: number; bias?: number }) => {
    const est = clamp(a.p + gaussian(() => next(r)) * noise, 0.01, 0.99);
    const bias = a.bias ?? 0;
    out.push({
      kind: a.kind,
      target: a.target,
      receiver: a.receiver,
      p: a.p,
      est,
      chance: a.chance,
      u: a.p * a.win - (1 - a.p) * a.lose * lossW + bias,
      ue: est * a.win - (1 - est) * a.lose * lossW + bias,
    });
  };

  // ── Passes to every teammate he perceives ──
  for (const m of mates(s, c.team)) {
    if (m.index === c.index) continue;
    const dx = m.pos.x - c.pos.x;
    const dy = m.pos.y - c.pos.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 4 || d > 60) continue;
    if (allowed === 'throwIn' && d > 25) continue;
    // Field of view of 200°: behind him he sees with vision only (02 §5.6).
    const inView = (dx * face.x + dy * face.y) / d > -0.17;
    const see = inView ? 0.97 : 0.25 + 0.55 * vision;
    if (next(r) > see) continue;
    const mt = toTeam(c, m.pos);
    const long = d > 32;
    // Nobody lofts the ball back towards his own goal: back passes to the box are short and along the ground.
    if (mt.x < 20 && mt.x < me.x && (long || d > 25)) continue;
    const lofted = long || allowed === 'throwIn' || allowed === 'goalKick' && d > 30;
    const speed = lofted ? 16 + 0.1 * d : groundSpeed(d);
    const p = passSafety(s, c.team, c.pos, m.pos, speed, lofted, m) * (lofted ? LOFT_RISK : 1);
    const forward = mt.x - me.x;
    let bias = 0;
    if (plan.progression === 'vertical' && forward > 8) bias += 0.004;
    if (plan.progression === 'wide' && (mt.y < 14 || mt.y > WIDTH - 14)) bias += 0.004;
    if (plan.progression === 'central' && Math.abs(mt.y - CENTER.y) < 14) bias += 0.003;
    if (plan.buildUp === 'short' && lofted && me.x < 50) bias -= 0.01;
    if (plan.buildUp === 'long' && lofted && me.x < 50 && forward > 20) bias += 0.008;
    const win = valueAt(mt.x, mt.y) * (1 - 0.3 * pressureOn(s, m));
    push({
      kind: lofted ? 'long' : 'pass',
      target: { ...m.pos },
      receiver: m,
      p,
      win,
      lose: oppValue({ x: (me.x + mt.x) / 2, y: (me.y + mt.y) / 2 }),
      bias,
    });

    // Through ball into the space ahead of a forward-facing runner (02 §5.6: needs vision).
    if (allowed === 'open' && lineOf(m.role) !== 'def' && mt.x > me.x + 5 && mt.x < 90) {
      if (next(r) > 0.3 + 0.7 * vision) continue;
      // Space behind the line, short of the keeper's area (he would claim it).
      const ahead = flip(c.team, { x: Math.min(mt.x + 9, 93), y: mt.y + (CENTER.y - mt.y) * 0.15 });
      const td = Math.sqrt((ahead.x - c.pos.x) ** 2 + (ahead.y - c.pos.y) ** 2);
      const ts = groundSpeed(td) * 0.95;
      const tp = passSafety(s, c.team, c.pos, ahead, ts, false, m);
      const at = toTeam(c, ahead);
      push({
        kind: 'through',
        target: ahead,
        receiver: m,
        p: tp * 0.9,
        win: valueAt(at.x, at.y),
        lose: oppValue(at),
        bias: 0.003 * (plan.finalThird.throughBalls - 3),
      });
    }
  }

  // ── Cross into the box from a wide spot in the final third ──
  if ((allowed === 'open' || allowed === 'corner' || allowed === 'freeKick') && me.x > 75 && (me.y < 20 || me.y > WIDTH - 20)) {
    const inBox = mates(s, c.team).filter((m) => {
      const t = toTeam(c, m.pos);
      return t.x > 88.5 && t.y > 14 && t.y < WIDTH - 14 && m.index !== c.index;
    });
    const spot = flip(c.team, { x: 96, y: CENTER.y + (me.y < CENTER.y ? 2 : -2) });
    const opp = opponents(s, c.team).filter((o) => {
      const t = toTeam(c, o.pos);
      return t.x > 88.5 && t.y > 14 && t.y < WIDTH - 14;
    });
    // A cross works when attackers in the box outnumber defenders there.
    const p = clamp(0.18 + 0.08 * (inBox.length - opp.length) + 0.25 * norm(c.attrs.crossing), 0.05, 0.6);
    push({
      kind: 'cross',
      target: spot,
      receiver: null,
      p,
      win: 0.16,
      lose: 0.01,
      bias: allowed === 'corner' ? 1 : 0.004 * (plan.finalThird.crosses - 3),
    });
  }

  if (allowed === 'corner') return pick(out, c, pressure, r);

  // ── Shot ──
  const angle = goalAngle(me.x, me.y);
  if ((allowed === 'open' || allowed === 'freeKick') && me.x > 70 && angle > 0.08) {
    const chance = chanceFrom(s, c);
    const far = me.x < 87;
    let bias = SHOT_RESERVE;
    if (far) bias += 0.006 * (plan.finalThird.shootFromDistance - 3);
    if (c.input.traits.includes('shootsFromDistance') && far) bias += 0.008;
    push({ kind: 'shot', target: flip(c.team, { x: LENGTH, y: CENTER.y }), receiver: null, p: chance, win: 1, lose: 0.012, chance, bias });
  }

  if (allowed === 'open') {
    // ── Carry forward, diagonally, or hold and shield ──
    for (const [ax, ay] of [
      [1, 0],
      [0.7, 0.7],
      [0.7, -0.7],
    ] as const) {
      const t = { x: clamp(me.x + 7 * ax, 1, LENGTH - 1), y: clamp(me.y + 7 * ay, 1, WIDTH - 1) };
      const wt = flip(c.team, t);
      const mine = arrivalTime(kin(c), wt, true) * 1.15;
      let theirs = Infinity;
      for (const o of opponents(s, c.team)) theirs = Math.min(theirs, arrivalTime(kin(o), wt, false));
      const keep = clamp(0.5 + (theirs - mine) * 0.6, 0.05, 0.97) * (0.85 + 0.15 * norm(c.attrs.dribbling));
      push({
        kind: 'carry',
        target: wt,
        receiver: null,
        p: keep,
        win: valueAt(t.x, t.y),
        lose: oppValue(me),
        bias: c.input.traits.includes('holdsBall') ? 0.002 : 0,
      });
    }
    // Dribble past the nearest opponent in front (02 §6 drible × desarme).
    const front = opponents(s, c.team)
      .map((o) => ({ o, t: toTeam(c, o.pos) }))
      .filter(({ t }) => t.x > me.x - 0.5 && Math.abs(t.y - me.y) < 3 && t.x - me.x < 4)
      .sort((a, b) => a.t.x - b.t.x)[0];
    if (front) {
      const p = dribbleChance(c, front.o);
      const past = { x: clamp(me.x + 8, 1, LENGTH - 1), y: me.y };
      push({
        kind: 'dribble',
        target: flip(c.team, past),
        receiver: null,
        p,
        win: valueAt(past.x, past.y) * 1.1,
        lose: oppValue(me),
        bias: c.input.traits.includes('triesDribbles') ? 0.006 : 0,
      });
    }
    push({ kind: 'hold', target: { ...c.pos }, receiver: null, p: 1 - 0.5 * pressure, win: valueAt(me.x, me.y) * 0.97, lose: oppValue(me) });
  }

  // ── Clear the ball away under pressure near our goal ──
  if (me.x < 30 && pressure > 0.1) {
    const t = flip(c.team, { x: 62, y: me.y < CENTER.y ? 12 : WIDTH - 12 });
    push({ kind: 'clear', target: t, receiver: null, p: 0.45, win: 0.012, lose: 0.01 });
  }
  return pick(out, c, pressure, r);
}

/** Chance that `c` beats `d` in a dribble (02 §6, logistic of the attribute difference). PARAMETERS. */
export function dribbleChance(c: MatchPlayer, d: MatchPlayer): number {
  const att = weighted(c.attrs, { dribbling: 0.45, agility: 0.2, balance: 0.15, acceleration: 0.2 });
  const def = weighted(d.attrs, { tackling: 0.4, anticipation: 0.25, positioning: 0.2, pace: 0.15 });
  return contest(att - def, 0.12, 0.12);
}

function pick(out: Action[], c: MatchPlayer, pressure: number, r: Rng): Choice {
  if (out.length === 0)
    return {
      action: { kind: 'hold', target: { ...c.pos }, receiver: null, p: 1, est: 1, u: 0, ue: 0 },
      best: 0,
    };
  const decisions = norm(c.attrs.decisions);
  const composure = norm(c.attrs.composure);
  // Softmax temperature: falls with decisions and composure, rises with pressure (02 §5.4). PARAMETER.
  const tau = 0.01 * (1.6 - 0.6 * decisions - 0.4 * composure) * (1 + 0.8 * pressure);
  const top = Math.max(...out.map((a) => a.ue));
  const w = out.map((a) => exp((a.ue - top) / tau));
  const total = w.reduce((x, y) => x + y, 0);
  let u = next(r) * total;
  let k = 0;
  while (k < out.length - 1 && u >= w[k]!) u -= w[k++]!;
  return { action: out[k]!, best: Math.max(...out.map((a) => a.u)) };
}
