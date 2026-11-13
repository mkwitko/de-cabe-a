/**
 * Runtime world of a spatial match: players, plans, the ball as the team
 * layer sees it, and the coordination clock (MC-246; grows into the full
 * match state of MC-031). Positions are in the world frame.
 */
import type { Attributes, RoleId, TacticalPlan } from './contract';
import { due } from './ball';
import { maxSpeed, moveTowards, separate, type Mover } from './movement';
import { CENTER, LENGTH, WIDTH, clamp, flip, type Vec2 } from './pitch';
import { fork, next, type Rng } from './random';
import {
  anchors,
  assign,
  lineOf,
  offsideLine,
  spreadTargets,
  tasksFor,
  type Assignment,
  type BallView,
  type TaskKind,
  type TeamMemory,
  type TeamPlayer,
} from './team';

export interface WorldPlayer extends TeamPlayer, Mover {
  /** Current target, world frame, and why. */
  target: Vec2;
  intent: TaskKind | 'anchor' | 'carry';
}

export interface TaskLog {
  tick: number;
  team: 0 | 1;
  player: number;
  task: TaskKind;
  key: string;
  /** Assigned on a possession change, restart or command (hysteresis does not apply). */
  event: boolean;
}

export interface World {
  tick: number;
  rng: Rng;
  players: WorldPlayer[];
  plans: [TacticalPlan, TacticalPlan];
  memory: [TeamMemory, TeamMemory];
  ball: BallView;
  /** Familiarity of each team with its plan, 0..1 (02 §8.5). */
  familiarity: [number, number];
  assignments: [Assignment[], Assignment[]];
  log: TaskLog[];
}

export interface TeamSetup {
  plan: TacticalPlan;
  /** Eleven players' attributes in slot order. */
  attrs: Attributes[];
  familiarity?: number;
}

export function createWorld(seed: Rng, teams: [TeamSetup, TeamSetup], kickoff: 0 | 1 = 0): World {
  const players: WorldPlayer[] = [];
  for (const team of [0, 1] as const) {
    const s = teams[team];
    for (let slot = 0; slot < 11; slot++) {
      const a = s.attrs[slot]!;
      const home = s.plan.shapes.outOfPossession[slot]!;
      const pos = flip(team, { x: home.x * 0.95, y: home.y });
      players.push({
        index: team * 11 + slot,
        team,
        slot,
        role: s.plan.roles[slot] as RoleId,
        attrs: a,
        pos,
        vel: { x: 0, y: 0 },
        stamina: 1,
        active: true,
        pace: a.pace,
        acceleration: a.acceleration,
        target: { ...pos },
        intent: 'anchor',
      });
    }
  }
  return {
    tick: 0,
    rng: fork(seed, 'world'),
    players,
    plans: [teams[0].plan, teams[1].plan],
    memory: [{ owners: {} }, { owners: {} }],
    ball: {
      pos: { ...CENTER },
      focal: { ...CENTER },
      holder: kickoff * 11 + 9,
      possession: kickoff,
    },
    familiarity: [teams[0].familiarity ?? 1, teams[1].familiarity ?? 1],
    assignments: [[], []],
    log: [],
  };
}

/**
 * Chance that a player follows the task the team gave him instead of his own
 * reading (02 §5.11 point 5). PARAMETER: 0.80 to 0.98 by teamwork, positioning
 * and familiarity.
 */
const compliance = (a: Attributes, fam: number) =>
  0.8 + 0.18 * ((0.5 * a.teamwork + 0.5 * a.positioning) / 99) * fam;

/** PARAMETER: widest gap between neighbours of a back line without the ball, metres. */
const BACK_SPACING = 13;
/** PARAMETER: metres two teammates keep between them while moving (T3 counts under 2 m). */
const PERSONAL_SPACE = 3;
/** Intents run at full speed; the others jog (PARAMETERS: base jog m/s and m/s per metre off target). */
const URGENT = new Set<WorldPlayer['intent']>([
  'press',
  'receive',
  'cover',
  'mark',
  'closeLane',
  'depth',
  'carry',
]);
const JOG = 1.8;
const JOG_GAIN = 0.25;
/** PARAMETER: deepest a player outside the rest defence stays behind the ball with it (T9 counts beyond 12 m). */
const JOIN_BEHIND = 10;

/** Runs the team layer for `team`: tasks on the coordination clock or on an event, targets every step. */
export function coordinate(w: World, team: 0 | 1, event: boolean): void {
  const plan = w.plans[team];
  const mine = w.players.filter((p) => p.team === team && p.active);
  const opp = w.players.filter((p) => p.team !== team && p.active).map((p) => flip(team, p.pos));
  const ball = flip(team, w.ball.pos);
  const focal = flip(team, w.ball.focal);
  const inPossession = w.ball.possession === team;
  const lastLine = offsideLine(opp);
  const anc = anchors(plan, inPossession, focal, inPossession ? lastLine : null);
  const anchorsByIndex = new Map(mine.map((p) => [p.index, anc[p.slot]!]));
  const defX = mine.filter((p) => lineOf(p.role) === 'def').map((p) => anc[p.slot]!.x);
  const ourLine = defX.length ? Math.min(...defX) : 0;

  if (event || due('coordination', w.tick)) {
    const tasks = tasksFor(plan, inPossession, ball, focal, opp, lastLine, ourLine);
    // The carrier (or the intended receiver) is not available for tasks.
    const pool = mine.filter((p) => p.index !== w.ball.holder);
    const prev = new Map(w.assignments[team].map((a) => [a.player, a]));
    const next_ = assign(tasks, pool, anchorsByIndex, team, w.memory[team], !event, inPossession);
    // Collective errors: a player may miss a new task and follow his own reading (his
    // anchor) instead; the task is then left uncovered — two go to the ball, nobody covers.
    const kept: Assignment[] = [];
    for (const a of next_) {
      const old = prev.get(a.player);
      const p = w.players[a.player]!;
      const isNew = !old || old.task.key !== a.task.key;
      if (isNew && !event && next(w.rng) > compliance(p.attrs, w.familiarity[team])) continue;
      if (isNew) {
        w.log.push({
          tick: w.tick,
          team,
          player: a.player,
          task: a.task.kind,
          key: a.task.key,
          event,
        });
      }
      kept.push(a);
    }
    w.assignments[team] = kept;
  }

  // Targets: task point (refreshed to the current focal geometry by key), else anchor.
  const byPlayer = new Map(w.assignments[team].map((a) => [a.player, a]));
  const ordered = [...mine].sort((a, b) => {
    const pa = byPlayer.get(a.index)?.task.priority ?? 99;
    const pb = byPlayer.get(b.index)?.task.priority ?? 99;
    return pa - pb || a.index - b.index;
  });
  const fresh = new Map(
    tasksFor(plan, inPossession, ball, focal, opp, lastLine, ourLine).map((t) => [t.key, t.point]),
  );
  const targets: Vec2[] = [];
  for (const p of ordered) {
    if (p.index === w.ball.holder) {
      targets.push(flip(team, p.pos));
      p.intent = 'carry';
      continue;
    }
    const a = byPlayer.get(p.index);
    let pt = a ? (fresh.get(a.task.key) ?? a.task.point) : anc[p.slot]!;
    // With the ball, the rest defence is the players the plan leaves behind (02 §5.9);
    // everyone else without a task joins the play instead of idling deep in the shape.
    if (!a && inPossession && lineOf(p.role) !== 'gk')
      pt = { x: Math.max(pt.x, focal.x - JOIN_BEHIND), y: pt.y };
    p.intent = a ? a.task.kind : 'anchor';
    targets.push({ ...pt });
  }
  // Compensation (02 §5.3): without the ball, the defenders left in the line close
  // up around its centre, so a defender who steps out does not leave a hole.
  if (!inPossession) {
    const line = ordered
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => lineOf(p.role) === 'def' && p.intent === 'anchor')
      .sort((a, b) => anc[a.p.slot]!.y - anc[b.p.slot]!.y);
    if (line.length >= 2) {
      const ys = line.map(({ p }) => anc[p.slot]!.y);
      const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
      const cx = line.reduce((a, { p }) => a + anc[p.slot]!.x, 0) / line.length;
      const spacing = Math.min(BACK_SPACING, (ys[ys.length - 1]! - ys[0]!) / (line.length - 1));
      line.forEach(({ i }, k) => {
        targets[i] = { x: cx, y: clamp(cy + (k - (line.length - 1) / 2) * spacing, 2, WIDTH - 2) };
      });
    }
  }
  // The keeper and the carrier keep their spot; everyone else spreads out.
  const movable = ordered
    .map((p, i) => ({ p, t: targets[i]! }))
    .filter(({ p }) => lineOf(p.role) !== 'gk' && p.index !== w.ball.holder);
  spreadTargets(movable.map((m) => m.t));
  // Two teammates running side by side (02 §5.11 point 6): the later one in priority
  // order steers away from the other, so distinct targets do not end in one moving pair.
  // The carrier counts as an obstacle too.
  const holder = mine.find((p) => p.index === w.ball.holder);
  for (let i = 0; i < movable.length; i++) {
    const others = movable.slice(0, i).map((m) => m.p);
    if (holder) others.push(holder);
    for (const o of others) {
      const a = flip(team, o.pos);
      const b = flip(team, movable[i]!.p.pos);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= PERSONAL_SPACE) continue;
      // Step aside first, then keep heading for the target: away plus at most PERSONAL_SPACE of progress.
      const ux = d > 1e-6 ? dx / d : 0;
      const uy = d > 1e-6 ? dy / d : 1;
      const t = movable[i]!.t;
      const vx = t.x - b.x;
      const vy = t.y - b.y;
      const v = Math.sqrt(vx * vx + vy * vy);
      const s = v > PERSONAL_SPACE ? PERSONAL_SPACE / v : 1;
      t.x = clamp(b.x + ux * PERSONAL_SPACE + vx * s, 1, LENGTH - 1);
      t.y = clamp(b.y + uy * PERSONAL_SPACE + vy * s, 1, WIDTH - 1);
      break;
    }
  }
  ordered.forEach((p, i) => (p.target = flip(team, targets[i]!)));
}

/** Moves every active player one step towards his target. The carrier is moved by the caller. */
export function movePlayers(w: World): void {
  // A back line holding its zone moves as a unit, at the pace of its slowest member (02 §5.2).
  const lineCap: [number, number] = [Infinity, Infinity];
  for (const team of [0, 1] as const) {
    if (w.ball.possession === team) continue;
    for (const p of w.players)
      if (p.team === team && p.active && p.intent === 'anchor' && lineOf(p.role) === 'def')
        lineCap[team] = Math.min(lineCap[team], maxSpeed(p));
  }
  for (const p of w.players) {
    if (!p.active || p.index === w.ball.holder) continue;
    const unit = p.intent === 'anchor' && lineOf(p.role) === 'def' && w.ball.possession !== p.team;
    // Effort (02 §4 fôlego): urgent jobs at full speed; the rest jog, faster the further off they are.
    const dx = p.target.x - p.pos.x;
    const dy = p.target.y - p.pos.y;
    const effort = URGENT.has(p.intent) ? Infinity : JOG + JOG_GAIN * Math.sqrt(dx * dx + dy * dy);
    moveTowards(p, p.target, Math.min(unit ? lineCap[p.team] : Infinity, effort));
  }
  separate(w.players.filter((p) => p.active));
  for (const p of w.players) {
    p.pos.x = clamp(p.pos.x, 0, LENGTH);
    p.pos.y = clamp(p.pos.y, 0, WIDTH);
  }
}
