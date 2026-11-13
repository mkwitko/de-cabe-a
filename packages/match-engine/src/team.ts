/**
 * Team layer (MC-246; 02-MATCH-ENGINE.md §5.1, §5.2, §5.9, §5.11): phase, focal
 * point, shape anchors, collective tasks and their greedy assignment by
 * arrival-time cost, with hysteresis. Individual decision (MC-033/034) runs
 * inside the task this layer hands out.
 * Everything here works in the team frame (attacking +x).
 */
import type { Attributes, RoleId, TacticalPlan } from './contract';
import { arrivalTime, kinOf, type Kin } from './kinematics';
import { CENTER, LENGTH, WIDTH, clamp, dist, flip, type Vec2 } from './pitch';

export type Line = 'gk' | 'def' | 'mid' | 'att';
const DEF_ROLES = new Set<RoleId>([
  'centreBack',
  'libero',
  'supportFullBack',
  'invertedFullBack',
  'wingBack',
]);
const MID_ROLES = new Set<RoleId>(['anchor', 'deepPlaymaker', 'boxToBox', 'playmaker']);
export const lineOf = (role: RoleId): Line =>
  role === 'goalkeeper' || role === 'sweeperKeeper'
    ? 'gk'
    : DEF_ROLES.has(role)
      ? 'def'
      : MID_ROLES.has(role)
        ? 'mid'
        : 'att';

/** What the team layer reads about a player. Positions in the world frame. */
export interface TeamPlayer {
  index: number;
  team: 0 | 1;
  slot: number;
  role: RoleId;
  attrs: Attributes;
  pos: Vec2;
  vel: Vec2;
  stamina: number;
  /** Players sent off or injured are not on the pitch. */
  active: boolean;
}

export type TaskKind =
  | 'press'
  | 'cover'
  | 'guardZone'
  | 'closeLane'
  | 'mark'
  | 'restDefence'
  | 'support'
  | 'width'
  | 'depth'
  | 'box'
  | 'betweenLines'
  | 'receive';

export interface Task {
  kind: TaskKind;
  /** Distinguishes tasks of the same kind (left/right width, mark target index…). */
  key: string;
  point: Vec2; // team frame
  priority: number;
}

export interface Assignment {
  task: Task;
  player: number; // world index
  cost: number;
}

export interface TeamMemory {
  /** Last owner per task key, for hysteresis. */
  owners: Map<string, number>;
}

export interface BallView {
  /** Ball now and the focal point (where it will be played next), world frame. */
  pos: Vec2;
  focal: Vec2;
  /** World index of the player in control or the intended receiver, or null when loose. */
  holder: number | null;
  /** Team in possession, or null when loose. */
  possession: 0 | 1 | null;
}

// ── Shape (02 §5.2) ──────────────────────────────────────────────────────────

/** PARAMETERS: how much each line follows the ball, and metres per line-height point. */
const FOLLOW_X: Record<Line, number> = { gk: 0.1, def: 0.5, mid: 0.55, att: 0.45 };
/** A high block's back line follows the ball up more, to stay close to the pressing midfield. */
const FOLLOW_X_HIGH_DEF = 0.7;
const FOLLOW_Y: Record<Line, number> = { gk: 0.08, def: 0.3, mid: 0.4, att: 0.35 };
/** Out of possession the block slides towards the ball and narrows (whole team 35 to 48 m wide, 02 §11). */
const FOLLOW_Y_OUT: Record<Line, number> = { gk: 0.08, def: 0.5, mid: 0.5, att: 0.35 };
const NARROW_OUT: Record<Line, number> = { gk: 1, def: 0.8, mid: 0.85, att: 0.9 };
/** Deepest x a line takes without the ball: the back line holds near the penalty spot, not on the goal line. */
const FLOOR_OUT: Record<Line, number> = { gk: 0, def: 7, mid: 13, att: 20 };
/**
 * Highest x each line takes without the ball, by block: the block's height is
 * where the team defends (research 11 §4.1: low < 37.5 m, mid up to 57.5 m of
 * median x on a 105 m pitch). PARAMETERS.
 */
const BLOCK_TOP: Record<'high' | 'mid' | 'low', Record<Line, number>> = {
  high: { gk: LENGTH, def: LENGTH, mid: LENGTH, att: LENGTH },
  mid: { gk: LENGTH, def: 40, mid: 52, att: 64 },
  low: { gk: LENGTH, def: 26, mid: 37, att: 48 },
};
const STEP_UP: Record<Line, number> = { gk: 1.5, def: 4, mid: 3, att: 2 };
const BLOCK_SHIFT = { high: 9, mid: 0, low: -9 } as const;

/**
 * Anchor of each slot (team frame). `lastLine` is the opponents' offside line
 * in this team's frame (attackers stay onside); `null` when not relevant.
 */
export function anchors(
  plan: TacticalPlan,
  inPossession: boolean,
  focal: Vec2,
  lastLine: number | null,
): Vec2[] {
  const base = inPossession ? plan.shapes.inPossession : plan.shapes.outOfPossession;
  const t = plan.team;
  const widthScale = 0.8 + 0.1 * (t.width - 1);
  const out = base.map((b, slot) => {
    const line = lineOf(plan.roles[slot]!);
    const fx =
      line === 'def' && !inPossession && t.block === 'high' ? FOLLOW_X_HIGH_DEF : FOLLOW_X[line];
    let x = b.x + (focal.x - CENTER.x) * fx + (t.lineHeight - 3) * STEP_UP[line];
    if (!inPossession && line !== 'gk') x += BLOCK_SHIFT[t.block];
    let y = inPossession
      ? CENTER.y + (b.y - CENTER.y) * widthScale + (focal.y - CENTER.y) * FOLLOW_Y[line]
      : CENTER.y + (b.y - CENTER.y) * NARROW_OUT[line] + (focal.y - CENTER.y) * FOLLOW_Y_OUT[line];
    if (line === 'gk') {
      // Keeper on the line between the ball and the goal centre, deeper when the ball is near.
      x = inPossession ? clamp(6 + focal.x * 0.12, 6, 20) : clamp(2.5 + focal.x * 0.06, 2.5, 9);
      y = CENTER.y + (focal.y - CENTER.y) * 0.12;
    }
    return { x, y, line };
  });
  // Compactness: pull outfield lines towards their mean x (02 §8.1).
  const outfield = out.filter((a) => a.line !== 'gk');
  const cx = outfield.reduce((s, a) => s + a.x, 0) / outfield.length;
  // Without the ball the block squeezes more (whole-team length 31 to 46 m, smaller without the ball, 02 §11).
  const k = inPossession ? 1.15 - 0.075 * t.compactness : 1.0 - 0.06 * t.compactness;
  return out.map((a) => {
    let x = a.line === 'gk' ? a.x : cx + (a.x - cx) * k;
    if (!inPossession) x = Math.min(Math.max(x, FLOOR_OUT[a.line]), BLOCK_TOP[t.block][a.line]);
    if (inPossession && a.line !== 'gk' && lastLine !== null)
      x = Math.min(x, Math.max(lastLine - 0.8, focal.x - 2));
    return { x: clamp(x, 1, LENGTH - 1), y: clamp(a.y, 1, WIDTH - 1) };
  });
}

// ── Tasks (02 §5.11) ─────────────────────────────────────────────────────────

/** Aptitude of a line for a task kind, 0..1 (PARAMETER). */
const APTITUDE: Record<TaskKind, Record<Line, number>> = {
  press: { gk: 0, def: 0.4, mid: 0.9, att: 0.8 },
  cover: { gk: 0, def: 0.7, mid: 0.9, att: 0.3 },
  guardZone: { gk: 0, def: 0.5, mid: 1, att: 0.1 },
  closeLane: { gk: 0, def: 0.4, mid: 0.9, att: 0.6 },
  mark: { gk: 0, def: 0.9, mid: 0.8, att: 0.3 },
  restDefence: { gk: 0, def: 1, mid: 0.7, att: 0.1 },
  support: { gk: 0, def: 0.4, mid: 1, att: 0.6 },
  width: { gk: 0, def: 0.7, mid: 0.4, att: 0.9 },
  depth: { gk: 0, def: 0.1, mid: 0.4, att: 1 },
  box: { gk: 0, def: 0.1, mid: 0.5, att: 1 },
  betweenLines: { gk: 0, def: 0.1, mid: 0.9, att: 0.8 },
  receive: { gk: 1, def: 1, mid: 1, att: 1 },
};

/** Rest defence stands this far behind the ball (02 §5.9); T9 counts players more than 12 m behind. */
export const REST_BEHIND = 16;

/** Where `us` would press: does the block allow engaging the ball at `ballX` (team frame)? */
const pressReach = { high: LENGTH, mid: 70, low: 40 } as const;
/** How far behind the ball (towards the opponents' goal) a block still marks options. */
const MARK_BEHIND = { high: 25, mid: 6, low: 3 } as const;

/**
 * Tasks for team `team` given the ball. `opp` are the opponents in this team's
 * frame. Returns tasks ordered by priority (0 first).
 */
export function tasksFor(
  plan: TacticalPlan,
  inPossession: boolean,
  ball: Vec2,
  focal: Vec2,
  opp: Vec2[],
  lastLine: number,
  /** Our back line's x (team frame), out of possession: nobody is marked below it. */
  ourLine = 0,
): Task[] {
  const t = plan.team;
  const tasks: Task[] = [];
  const add = (kind: TaskKind, key: string, point: Vec2) =>
    tasks.push({
      kind,
      key,
      point: { x: clamp(point.x, 1, LENGTH - 1), y: clamp(point.y, 1, WIDTH - 1) },
      priority: tasks.length,
    });
  const side = focal.y < CENTER.y ? -1 : 1;

  if (inPossession) {
    // Nobody is offside behind the ball: the line that limits runs is the deeper of the two.
    lastLine = Math.max(lastLine, ball.x);
    // Rest defence first: the plan's number stays behind the ball (02 §5.9).
    const n = t.restDefence;
    const restX = Math.min(focal.x - REST_BEHIND, 62);
    for (let i = 0; i < n; i++) {
      const y = CENTER.y + (i - (n - 1) / 2) * (n <= 2 ? 16 : 13);
      add('restDefence', `rest${i}`, { x: restX - (i === 0 || i === n - 1 ? 0 : 4), y });
    }
    add('support', 'supportA', { x: focal.x + 2, y: focal.y - 11 });
    add('support', 'supportB', { x: focal.x + 2, y: focal.y + 11 });
    const wideX = Math.min(focal.x + 6, lastLine - 1);
    const edge = 3 + (3 - t.width) * 2.5;
    add('width', 'widthR', { x: wideX, y: edge });
    add('width', 'widthL', { x: wideX, y: WIDTH - edge });
    add('depth', 'depth', { x: Math.max(lastLine - 1, focal.x + 4), y: CENTER.y + side * 6 });
    if (focal.x > 70) {
      add('box', 'boxNear', { x: 95, y: CENTER.y + side * 4 });
      if (t.finalThird.boxPresence >= 3) add('box', 'boxFar', { x: 92, y: CENTER.y - side * 6 });
    } else {
      add('betweenLines', 'between', {
        x: Math.min(focal.x + 14, lastLine - 3),
        y: CENTER.y - side * 8,
      });
    }
    return tasks;
  }

  // Out of possession.
  const engage = ball.x <= pressReach[t.block] || t.pressIntensity >= 5;
  const goal = { x: 0, y: CENTER.y };
  const toGoal = (p: Vec2, d: number) => {
    const dx = goal.x - p.x;
    const dy = goal.y - p.y;
    const l = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: p.x + (dx / l) * d, y: p.y + (dy / l) * d };
  };
  // Engaging the carrier, or holding off 6 m goal-side when the block does not press there.
  add('press', 'press', engage ? focal : toGoal(focal, 6));
  // Below the back line nobody is marked; above the block's reach nobody either (mid and low blocks wait).
  const top = t.block === 'high' ? LENGTH : pressReach[t.block] + 5;
  const aboveLine = (q: Vec2) => ({ x: clamp(q.x, ourLine - 2, top), y: q.y });
  if (t.pressIntensity >= 3 || ball.x < 40) add('cover', 'cover', aboveLine(toGoal(focal, 9)));
  if (ball.x < 60)
    add('guardZone', 'guard', {
      x: 20 + Math.max(0, ball.x - 30) * 0.15,
      y: CENTER.y + (focal.y - CENTER.y) * 0.3,
    });
  if (ball.x > 35)
    add('closeLane', 'lane', aboveLine({ x: (focal.x + 18) / 2, y: (focal.y + CENTER.y) / 2 }));
  // Mark the most dangerous options: near our goal and near the ball; a winger idle on the far touchline waits.
  const marks = 2 + (t.pressIntensity >= 4 ? 1 : 0) + (ball.x < 35 ? 1 : 0);
  const danger = opp
    .map((o, i) => ({ i, o, d: dist(o, goal) + 0.5 * dist(o, focal) }))
    // Opponents next to the ball are the press and cover's job; marking them too makes a swarm.
    // Options behind the ball are marked only by a high block; mid and low blocks mark what is ahead of it.
    .filter(
      (c) =>
        c.o.x < ball.x + MARK_BEHIND[t.block] &&
        c.o.x > ourLine - 4 &&
        c.o.x < top &&
        dist(c.o, focal) > 8,
    )
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .slice(0, marks);
  for (const c of danger) add('mark', `mark${c.i}`, aboveLine(toGoal(c.o, 2)));
  return tasks;
}

// ── Assignment ───────────────────────────────────────────────────────────────

/** PARAMETERS of the cost (seconds). */
const ZONE_COST = 0.08; // per metre the task drags the player away from his anchor
const FATIGUE_COST = 1.5; // at zero stamina
const APTITUDE_GAIN = 3;
/** A defender keeps the last line: he only takes tasks this close to his anchor (02 §5.11, "manter a última linha"). */
const DEF_RADIUS = 15;
const OUT_OF_ZONE = 1000;
const KEEP_MARGIN = 0.6; // a task changes owner only if the new cost is this much lower
/** Each defender considers only its three cheapest tasks (research 11 §1.7). */
const TOP_K = 3;

export function assign(
  tasks: Task[],
  players: TeamPlayer[],
  anchorsByIndex: Map<number, Vec2>,
  team: 0 | 1,
  memory: TeamMemory,
  keepOwners: boolean,
  /** The last line is kept only without the ball; with it, full-backs may overlap. */
  inPossession = false,
): Assignment[] {
  const kins = new Map<number, Kin>();
  for (const p of players)
    kins.set(p.index, kinOf(p.attrs, flip(team, p.pos), flip(team, p.vel), p.stamina));
  const cost = (p: TeamPlayer, t: Task) =>
    // Without the ball the back line defends its zone as a unit (02 §5.2, §5.11): a defender
    // only steps out to press a ball near his zone; marks and covers are midfield jobs.
    (!inPossession &&
    lineOf(p.role) === 'def' &&
    (t.kind !== 'press' || dist(anchorsByIndex.get(p.index)!, t.point) > DEF_RADIUS)
      ? OUT_OF_ZONE
      : 0) +
    arrivalTime(kins.get(p.index)!, t.point, true) +
    ZONE_COST * dist(anchorsByIndex.get(p.index)!, t.point) +
    FATIGUE_COST * (1 - p.stamina) -
    APTITUDE_GAIN * APTITUDE[t.kind][lineOf(p.role)];

  // Each player's top-K tasks (by cost) bound what the greedy pass may give him.
  const allowed = new Map<number, Set<string>>();
  for (const p of players) {
    const ranked = tasks.map((t) => ({ k: t.key, c: cost(p, t) })).sort((a, b) => a.c - b.c);
    allowed.set(p.index, new Set(ranked.slice(0, TOP_K).map((r) => r.k)));
  }

  const free = new Set(
    players.filter((p) => p.active && lineOf(p.role) !== 'gk').map((p) => p.index),
  );
  const byIndex = new Map(players.map((p) => [p.index, p]));
  const out: Assignment[] = [];
  for (const t of tasks) {
    if (free.size === 0) break;
    let best = -1;
    let bestCost = Infinity;
    for (const i of free) {
      if (!allowed.get(i)!.has(t.key) && t.kind !== 'press') continue;
      const c = cost(byIndex.get(i)!, t);
      if (c < bestCost || (c === bestCost && i < best)) {
        best = i;
        bestCost = c;
      }
    }
    if (best < 0) {
      // Nobody has it in the top K: the cheapest free player takes it.
      for (const i of free) {
        const c = cost(byIndex.get(i)!, t);
        if (c < bestCost || (c === bestCost && i < best)) {
          best = i;
          bestCost = c;
        }
      }
    }
    // Hysteresis (02 §5.5): the previous owner keeps it unless clearly beaten.
    const prev = memory.owners.get(t.key);
    if (keepOwners && prev !== undefined && prev !== best && free.has(prev)) {
      const prevCost = cost(byIndex.get(prev)!, t);
      if (prevCost < bestCost + KEEP_MARGIN) {
        best = prev;
        bestCost = prevCost;
      }
    }
    // Nobody fit for it without breaking the last line: the task stays open (02 §5.3, the gap stays).
    if (best < 0 || bestCost >= OUT_OF_ZONE / 2) continue;
    free.delete(best);
    memory.owners.set(t.key, best);
    out.push({ task: t, player: best, cost: bestCost });
  }
  return out;
}

/**
 * Spreads targets closer than `gap` metres (02 §5.11 point 6: duplicated
 * occupation costs): the later one moves away along the line between them.
 */
export function spreadTargets(targets: Vec2[], gap = 4): void {
  for (let i = 0; i < targets.length; i++)
    for (let j = 0; j < i; j++) {
      const a = targets[j]!;
      const b = targets[i]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= gap) continue;
      const ux = d > 1e-6 ? dx / d : 0;
      const uy = d > 1e-6 ? dy / d : 1;
      b.x = clamp(b.x + ux * (gap - d), 1, LENGTH - 1);
      b.y = clamp(b.y + uy * (gap - d), 1, WIDTH - 1);
    }
}

/** Offside line of the opponents in `team`'s frame: the second-deepest of them. */
export function offsideLine(oppInOurFrame: Vec2[]): number {
  const xs = oppInOurFrame.map((p) => p.x).sort((a, b) => b - a);
  return Math.max(xs[1] ?? 0, LENGTH / 2);
}
