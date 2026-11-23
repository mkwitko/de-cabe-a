/**
 * Level 2 engine (02 §12; MC-046): the matches nobody watches, played possession by
 * possession instead of position by position. Same input and result as level 1, no frames.
 *
 * - Players stand on the level 1 anchors (team.ts) for the ball's zone: 18 zones, 6 deep by
 *   3 lanes, computed once per plan.
 * - Every contest, chance, card, fatigue, injury, substitution, dead-ball time and coach
 *   decision comes from the shared core (rules/) and the coach module, never a copy.
 * - The executors are this level's own: who presses whom, how a pass is read, how long an
 *   action takes. Their constants (L2) are fitted so the statistics match level 1
 *   (calibration/equivalence.ts, TEST_STRATEGY.md §2.1).
 */
import type {
  Attributes,
  MatchEvent,
  MatchInput,
  MatchResult,
  PlayerInput,
  RoleId,
  TacticalPlan,
  TeamStats,
} from '../contract';
import { readTheGame } from '../match/coach';
import { emit } from '../match/events';
import { fork, next, rngFrom, type Rng } from '../random';
import { aerialFoulChance, beatenFoulChance, cardFor, foulChance } from '../rules/discipline';
import {
  aerialScore,
  contest,
  dribbleAttack,
  dribbleDefence,
  dribbleOdds,
  formOfTheDay,
  norm,
  pressResistance,
  pressSync,
  tackleAttack,
  tackleDefence,
  tackleOdds,
  weighted,
} from '../rules/duel';
import { explain } from '../rules/explain';
import { CONTACT_PER_FOUL, injuryRisk } from '../rules/injury';
import { gaussian } from '../rules/math';
import { DEAD_SECONDS, STOPPAGE_MS } from '../rules/restart';
import { holdChance, homeEdge, passSigma, passSkill, shotOdds, weakFootError } from '../rules/shot';
import { drain, recover } from '../rules/stamina';
import { SUB_FROM_MINUTE, bestReplacement, tiredLimit } from '../rules/subs';
import { settleSeconds } from '../rules/tempo';
import { valueAt } from '../rules/value';
import { PENALTY_XG, xg } from '../rules/xg';
import { REST_BEHIND, anchors, lineOf, type Line } from '../team';

const LENGTH = 105;
const WIDTH = 68;

/**
 * Executors of level 2 (PARAMETERS fitted against level 1, calibration/equivalence.ts).
 * Exported so the fitting script can move them; the engine never changes them.
 */
export const L2 = {
  /** Pressure: a defender this close (m) presses fully; steps out by press intensity and block. */
  pressRange: 7.4502,
  pressStep: 2.16,
  counterPressStep: 2.22222,
  /** Chance per action that the nearest defender challenges, times pressure. */
  challenge: 0.33809,
  /** Pass reading: defenders within laneRadius of the line, within recvRadius of the receiver. */
  laneRadius: 3.2,
  recvRadius: 4.8148,
  passBase: 0,
  passLane: 0.089216,
  passRecv: 0.029762,
  passError: 0.12479,
  /** Passes into the final third meet the packed defence: extra failure at the goal line. */
  passFinal: 0.16875,
  /** Utility offset of carrying the ball (take-ons are rarer than passes). */
  carryBias: -0.005759,
  /** Share of cleared crosses that go behind for a corner; tactical fouls per chance. */
  clearCorner: 0.806,
  /** Level 2 duels are fewer and coarser than level 1 contacts: scales their foul chance. */
  foulRate: 1.0547,
  /** Share of the plan's press that turns into more tackles (the rest closes space, not legs). */
  pressChallenge: 0.31021,
  /** Ceiling on a long ball landing with its man before the air duel (level 1: about half land). */
  longLand: 1.0,
  /** Share of lost long balls that go out for a throw-in (short passes: outOfPlay). */
  longOut: 0.3375,
  /** Share of the other lost long balls that drop loose instead of being cut out. */
  longLoose: 0.48,
  tacticalFoul: 0.70588,
  /** Forward passes are read more often (receivers marked goal-side): per 20 m of progress. */
  passForward: 0.35337,
  /** Shooting bar: utility a shot loses before it beats keeping the ball; a shot from outside 20 m gains farShot. */
  shotBar: 0.016852,
  farShot: 0.0058289,
  /** Value lost when the ball is lost, as a share of the opponents' value there. */
  lossWeight: 3.2219,
  /** Decision noise: utility spread for a player of decisions 0. */
  noise: 0.02952,
  /** Carry: metres a carry gains, and its pace (m/s). */
  carry: 7.4061,
  carrySpeed: 5.5,
  /** Seconds per action beyond the settle time, and ball speed of a pass. */
  timeScale: 0.75,
  passSpeed: 14,
  /** Metres a second a marker closes on the receiver while the pass travels. */
  closeSpeed: 5.148,
  /** Under pressure a defender or the keeper clears it long: utility per unit of pressure. */
  longRelief: 0.00999,
  longBias: 0.0080339,
  /** Utility of a ball over the top. */
  overBias: 0,
  overBase: 0.51157,
  /** Shots: blockers near the line from the shooter to the goal. */
  blockRadius: 3,
  blockWeight: 0.52,
  /** Crosses and through balls. */
  aerialDifficulty: 0.0872,
  crossAccuracy: 0.49518,
  throughOffside: 0.10433,
  /** How much the defending plan's engagement (press, block) scales how fast markers close on a receiver. */
  closeEngage: 1.1363,
  /** Success added to a ball in behind per unit of grass behind the line (0 at 35 m, ±1 at 5 and 65 m). */
  throughSpace: 0.1618,
  /** Metres per second the defending shape follows the ball upfield (it does not teleport). */
  shapeSpeed: 8.0,
  /** Attacking x (m) from which a plan's press and block no longer change how a side defends. */
  pressFade: 96.71,
  /** Share of the shape's lag a defender is caught upfield by. */
  shapeLag: 0.7,
  /** Foul chance in the defenders' own box, times the chance elsewhere. */
  boxCare: 0.0231,
  /** Share of free kicks near goal taken as a direct shot. */
  directShot: 0.2703,
  /** Share of lost passes that go out of play for a throw-in. */
  outOfPlay: 0.47729,
  /** Running per player in play (m/s) by line, and the intensity that drains stamina. */
  speed: { gk: 1.95, def: 3.9, mid: 4.3, att: 4.1 } as Record<Line, number>,
  intensity: 1.08,
  /** Extra effort per press-intensity level (and per block step), and per tempo level. */
  pressDrain: 0.11892,
  tempoDrain: 0.03447,
  /** Share of a forward pass's risk that open space behind a short defence removes. */
  spaceBehind: 0.5,
  /** A counter needs fewer than this many opponents goal-side of the ball. */
  counterBack: 7,
  /** Milliseconds the side that lost the ball takes to get back into its defensive shape. */
  recover: 6086.9565,
  /** Seconds of possession after which the carrier risks the most, and that floor of caution. */
  patience: 55.157,
  patienceFloor: 0.3,
  /** A team-mate closer than this to his marker steps away into space (findSpace). */
  space: 6,
  /** How much movement against marking moves him (findSpace), and the spread of the race for a ball in behind. */
  spaceSkill: 0.7276,
  raceSpread: 12.041,
  /** Metres a player strays from his anchor, each way (uniform). */
  jitter: 13.05185,
  /** Utility per metre of progress the plan's progression gives (vertical +, circulate −). */
  progression: 5e-5,
  /** Utility bonuses for the plan's instructions (per level away from 3). */
  bias: 0.004,
};

/** Blocked shot or cross goes behind for a corner (level 1 engine.ts BLOCK_BEHIND). */
const BLOCK_BEHIND = 0.58;
/** A parried shot goes wide for a corner (level 1 engine.ts save). */
const PARRY_WIDE = 0.55;

interface Pt {
  x: number;
  y: number;
}

interface Player2 {
  index: number;
  team: 0 | 1;
  slot: number;
  id: string;
  input: PlayerInput;
  attrs: Attributes;
  role: RoleId;
  line: Line;
  stamina: number;
  active: boolean;
  cards: 0 | 1 | 2;
  injured: boolean;
  score: number;
  msOn: number;
  distance: number;
  /** Derived once per match (attributes do not change in it): see `player`. */
  k: {
    pass: number;
    resist: number;
    air: number;
    run: number;
    chase: number;
    vision: number;
    cross: number;
    /** Long passing for a ball over the top. */
    long: number;
    sync: number;
    /** Dribble and tackle sides (rules/duel.ts), with and against the ball. */
    drib: number;
    dribD: number;
    tack: number;
    tackD: number;
    /** Reading of play: 0.6 (anticipation 0) to 1.4. */
    antic: number;
  };
}

interface Team2 {
  score: number;
  subsLeft: number;
  windowsLeft: number;
  bench: PlayerInput[];
  stats: TeamStats;
  possessionMs: number;
}

interface State2 {
  players: Player2[];
  offPitch: Player2[];
  events: MatchEvent[];
  clockMs: number;
  stoppage: number;
  teams: [Team2, Team2];
  plans: [TacticalPlan, TacticalPlan];
  coaches: MatchInput['teams'][0]['coach'][];
  coachSlot: number;
  basePlans?: [TacticalPlan['team'], TacticalPlan['team']];
  r: { decision: Rng; execution: Rng; referee: Rng; injury: Rng };
  crowd: number;
  strictness: number;
  /** Anchor of each slot, team frame: [team][0 with the ball | 1 without][zone][slot]. */
  spots: Pt[][][][];
  /** Team with the ball, the carrier (world index) and the ball in that team's frame. */
  att: 0 | 1;
  owner: number;
  ball: Pt;
  wonMs: number;
  lastPasser: number | null;
  /** The side that lost the ball presses it back until this clock (counter-press). */
  counterPress: [number, number];
  /** Offset of each player from his anchor this action, x and y by world index. */
  jit: number[];
  /** Slots that stay behind the ball in attack (the plan's rest defence, 02 §5.9), by team. */
  rest: number[][];
  /** Uniform draws of the decision and execution streams, for gaussian(). */
  ud: () => number;
  ue: () => number;
  /** Seconds of play not yet applied to the players' bodies (BODY_STEP). */
  body: number;
  /** Team of the current possession and when it began (patience). */
  possTeam: 0 | 1;
  possMs: number;
  /** Where (world frame) the defending shape is set for: it trails the ball at L2.shapeSpeed. */
  shapeAt: Pt;
  shapeMs: number;
}

// ── Geometry ────────────────────────────────────────────────────────────────

const zoneOf = (p: Pt) => {
  const d = Math.min(5, Math.max(0, Math.floor(p.x / 17.5)));
  const l = p.y < WIDTH / 3 ? 0 : p.y < (2 * WIDTH) / 3 ? 1 : 2;
  return d * 3 + l;
};
const centreOf = (z: number): Pt => ({
  x: (Math.floor(z / 3) + 0.5) * 17.5,
  y: ((z % 3) + 0.5) * (WIDTH / 3),
});
const mirror = (p: Pt): Pt => ({ x: LENGTH - p.x, y: WIDTH - p.y });
const world = (team: 0 | 1, p: Pt): Pt => (team === 0 ? p : mirror(p));
const d2 = (a: Pt, b: Pt) => (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
const dist = (a: Pt, b: Pt) => Math.sqrt(d2(a, b));
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
/** Distance from p to the segment a–b. */
function segDist(p: Pt, a: Pt, b: Pt): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const l2 = vx * vx + vy * vy || 1;
  const t = clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / l2, 0, 1);
  return dist(p, { x: a.x + t * vx, y: a.y + t * vy });
}
/** Defenders hold back in their own box: a foul there is a penalty (level 1: about 0.03 a team). */
const boxCare = (p: Pt) => (inBox(p) ? L2.boxCare : 1);
/** Where p falls along a–b: 0 at a, 1 at b (unclamped). */
function along(p: Pt, a: Pt, b: Pt): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  return ((p.x - a.x) * vx + (p.y - a.y) * vy) / (vx * vx + vy * vy || 1);
}
const inBox = (p: Pt) => p.x >= LENGTH - 16.5 && Math.abs(p.y - WIDTH / 2) <= 20.16;
const other = (t: 0 | 1): 0 | 1 => (t === 0 ? 1 : 0);

/**
 * Anchors depend only on the two plans: kept across matches (a career meets the same plans
 * again and again). ponytail: cleared whole when full; an LRU if plans churn.
 */
const SPOTS = new Map<string, Pt[][][][]>();
const SPOTS_MAX = 512;

function buildSpots(s: State2): void {
  const key = JSON.stringify([
    s.plans[0].shapes,
    s.plans[0].roles,
    s.plans[0].team,
    s.plans[1].shapes,
    s.plans[1].roles,
    s.plans[1].team,
  ]);
  let out = SPOTS.get(key);
  if (!out) {
    out = [
      [[], []],
      [[], []],
    ];
    for (const team of [0, 1] as const)
      for (let z = 0; z < 18; z++)
        out[team]![1]![z] = anchors(s.plans[team], false, centreOf(z), null);
    for (const team of [0, 1] as const)
      for (let z = 0; z < 18; z++) {
        // Attackers stay onside: the opponents' second-last player in this team's frame.
        const opp = out[other(team)]![1]![17 - z]!.map((p) => LENGTH - p.x).sort((a, b) => b - a);
        out[team]![0]![z] = anchors(s.plans[team], true, centreOf(z), opp[1] ?? null);
      }
    if (SPOTS.size >= SPOTS_MAX) SPOTS.clear();
    SPOTS.set(key, out);
  }
  s.spots = out;
  // Rest defence: the deepest outfield slots of the attacking shape, as many as the plan says.
  for (const team of [0, 1] as const) {
    const shape = out[team]![0]![7]!;
    s.rest[team] = shape
      .map((p, k) => ({ k, x: p.x }))
      .filter(({ k }) => lineOf(s.plans[team].roles[k]!) !== 'gk')
      .sort((a, b) => a.x - b.x || a.k - b.k)
      .slice(0, s.plans[team].team.restDefence)
      .map(({ k }) => k);
  }
}

/**
 * Rest defence (02 §5.9): past halfway the plan's rest slots stay REST_BEHIND metres behind the
 * ball (`ballX` in the team's own frame), so they are goal-side when the ball is lost; in their
 * own half they are the base of the build-up, on their anchors.
 */
const held = (p: Pt, ballX: number, rest: boolean): Pt =>
  rest && ballX > LENGTH / 2 && p.x > ballX - REST_BEHIND ? { x: ballX - REST_BEHIND, y: p.y } : p;

/** Where each player of `team` stands now, in the attacking team's frame. */
function placed(s: State2, team: 0 | 1): { p: Player2; at: Pt }[] {
  const z = zoneOf(s.ball);
  const attacking = team === s.att;
  const spots = s.spots[team]![attacking ? 0 : 1]![attacking ? z : 17 - z]!;
  const late = attacking ? 0 : Math.max(0, 1 - (s.clockMs - s.wonMs) / L2.recover);
  const lag = attacking ? 0 : Math.max(0, s.ball.x - world(s.att, s.shapeAt).x);
  const out: { p: Player2; at: Pt }[] = [];
  for (let k = 0; k < 11; k++) {
    const p = s.players[team * 11 + k]!;
    if (!p.active) continue;
    const sp = spots[k]!;
    const rest = s.rest[team]!.includes(k);
    let a = attacking ? held(sp, s.ball.x, rest) : { x: LENGTH - sp.x, y: WIDTH - sp.y };
    // Just lost the ball: still where the attack left them, recovering into the block.
    if (!attacking && late > 0) {
      const was = mirror(held(s.spots[team]![0]![17 - z]![k]!, LENGTH - s.ball.x, rest));
      a = { x: a.x + (was.x - a.x) * late, y: a.y + (was.y - a.y) * late };
    }
    // Caught upfield: the shape is set for where the ball was (attacking frame: lower x).
    if (!attacking && p.line !== 'gk') a = { x: a.x - lag * L2.shapeLag, y: a.y };
    // Players are never exactly on their anchor: a fresh offset each action (L2.jitter).
    out.push({
      p,
      at: {
        x: clamp(a.x + s.jit[2 * p.index]!, 0.5, LENGTH - 0.5),
        y: clamp(a.y + s.jit[2 * p.index + 1]!, 0.5, WIDTH - 0.5),
      },
    });
  }
  return out;
}

// ── Setup ───────────────────────────────────────────────────────────────────

const emptyStats = (): TeamStats => ({
  goals: 0,
  shots: 0,
  shotsOnTarget: 0,
  xg: 0,
  possession: 0,
  passes: 0,
  passesCompleted: 0,
  fouls: 0,
  yellowCards: 0,
  redCards: 0,
  corners: 0,
  offsides: 0,
});

function withForm(p: PlayerInput, r: Rng): PlayerInput {
  const f = formOfTheDay(
    p.hidden.consistency,
    gaussian(() => next(r)),
  );
  const attributes = { ...p.attributes };
  for (const k of Object.keys(attributes) as (keyof typeof attributes)[])
    attributes[k] = Math.max(1, Math.min(99, Math.round(attributes[k] * f)));
  return { ...p, attributes };
}

function player(input: PlayerInput, team: 0 | 1, slot: number, role: RoleId): Player2 {
  return {
    index: team * 11 + slot,
    team,
    slot,
    id: input.id,
    input,
    attrs: input.attributes,
    role,
    line: lineOf(role),
    stamina: input.condition,
    active: true,
    cards: 0,
    injured: false,
    score: 0,
    msOn: 0,
    distance: 0,
    k: {
      pass: passSkill(input.attributes, lineOf(role) === 'gk'),
      resist: pressResistance(input.attributes),
      air: aerialScore(input.attributes, input.heightCm),
      run: weighted(input.attributes, { pace: 0.4, acceleration: 0.3, offTheBall: 0.3 }),
      chase: weighted(input.attributes, { pace: 0.4, acceleration: 0.3, positioning: 0.3 }),
      vision: weighted(input.attributes, { vision: 0.6, passing: 0.4 }),
      cross: weighted(input.attributes, { crossing: 0.6, technique: 0.2, longPassing: 0.2 }),
      long: weighted(input.attributes, { longPassing: 0.6, technique: 0.2, vision: 0.2 }),
      sync: pressSync(input.attributes, input.familiarity),
      antic: 0.6 + 0.8 * norm(input.attributes.anticipation),
      drib: dribbleAttack(input.attributes),
      dribD: dribbleDefence(input.attributes),
      tack: tackleAttack(input.attributes),
      tackD: tackleDefence(input.attributes),
    },
  };
}

function create(input: MatchInput): State2 {
  const root = rngFrom(input.seed);
  const form = fork(root, 'form');
  const players: Player2[] = [];
  for (const team of [0, 1] as const)
    for (let slot = 0; slot < 11; slot++) {
      const t = input.teams[team];
      players.push(player(withForm(t.players[slot]!, form), team, slot, t.plan.roles[slot]!));
    }
  const team = (k: 0 | 1): Team2 => ({
    score: 0,
    subsLeft: input.rules.substitutions,
    windowsLeft: input.rules.substitutionWindows,
    bench: input.teams[k].players.slice(11),
    stats: emptyStats(),
    possessionMs: 0,
  });
  const s: State2 = {
    players,
    offPitch: [],
    events: [],
    clockMs: 0,
    stoppage: 0,
    teams: [team(0), team(1)],
    plans: [structuredClone(input.teams[0].plan), structuredClone(input.teams[1].plan)],
    coaches: [input.teams[0].coach, input.teams[1].coach],
    coachSlot: -1,
    r: {
      decision: fork(root, 'l2-decision'),
      execution: fork(root, 'l2-execution'),
      referee: fork(root, 'l2-referee'),
      injury: fork(root, 'l2-injury'),
    },
    crowd: input.conditions.crowd,
    strictness: input.conditions.refereeStrictness,
    spots: [],
    att: 0,
    owner: 9,
    ball: { x: LENGTH / 2, y: WIDTH / 2 },
    wonMs: 0,
    lastPasser: null,
    counterPress: [-1, -1],
    jit: Array.from({ length: 44 }, () => 0),
    rest: [[], []],
    ud: () => 0,
    ue: () => 0,
    body: 0,
    possTeam: 0,
    possMs: 0,
    shapeAt: { x: LENGTH / 2, y: WIDTH / 2 },
    shapeMs: 0,
  };
  s.ud = () => next(s.r.decision);
  s.ue = () => next(s.r.execution);
  buildSpots(s);
  return s;
}

// ── Clock, fatigue, bench ───────────────────────────────────────────────────

const ev = (s: State2) => s as unknown as Parameters<typeof emit>[0];
const say = (
  s: State2,
  kind: MatchEvent['kind'],
  team: 0 | 1 | null,
  p: Player2 | null,
  o: Player2 | null,
  at: Pt | null,
  data: Record<string, number> = {},
) => emit(ev(s), kind, team, p ? p.index : null, o ? o.index : null, at, data);

/** `seconds` of play with the ball in `team`'s possession. */
function play(s: State2, team: 0 | 1, seconds: number): void {
  s.clockMs += Math.round(seconds * 1000);
  s.teams[team].possessionMs += seconds * 1000;
  s.body += seconds;
  if (s.body >= BODY_STEP) body(s);
}

/** Seconds of play between two updates of legs, distance, injuries and the bench. */
const BODY_STEP = 15;

/** Running, fatigue and non-contact injuries for the play since the last update. */
function body(s: State2): void {
  const seconds = s.body;
  s.body = 0;
  for (const p of s.players) {
    if (!p.active) continue;
    p.msOn += seconds * 1000;
    const v = L2.speed[p.line] * (0.85 + 0.3 * norm(p.attrs.workRate));
    p.distance += v * seconds;
    // Pressing and a high block cost legs (research 13 §1); tempo too.
    const t = s.plans[p.team].team;
    const effort =
      1 +
      L2.pressDrain *
        (t.pressIntensity - 3 + (t.block === 'high' ? 1 : t.block === 'low' ? -1 : 0)) +
      L2.tempoDrain * (t.tempo - 3);
    drain(p, v * L2.intensity * effort, seconds);
    if (!p.injured && next(s.r.injury) < injuryRisk(p, seconds)) injure(s, p, false);
  }
  coachAndBench(s);
}

/** Ball out: the clock runs, players recover and walk back into place. */
function dead(s: State2, kind: keyof typeof DEAD_SECONDS): void {
  if (s.body > 0) body(s);
  const [lo, hi] = DEAD_SECONDS[kind];
  const ms = Math.round((lo + next(s.r.referee) * (hi - lo)) * 1000);
  s.clockMs += ms;
  if (kind === 'goal') s.stoppage += STOPPAGE_MS.goal;
  for (const p of s.players)
    if (p.active) {
      p.msOn += ms;
      recover(p, ms / 1000);
      p.distance += (0.85 * ms) / 1000;
    }
}

function injure(s: State2, p: Player2, contact: boolean): void {
  p.injured = true;
  p.stamina = Math.min(p.stamina, 0.15);
  say(s, 'injury', p.team, p, null, world(p.team, s.ball), { contact: contact ? 1 : 0 });
  s.stoppage += STOPPAGE_MS.injury;
}

function coachAndBench(s: State2): void {
  const before = s.events.length;
  readTheGame(s as unknown as Parameters<typeof readTheGame>[0]);
  if (s.events.length !== before) buildSpots(s);
  substitutions(s, false);
}

/** Same rule as level 1 (match/coach.ts substitutions), through rules/subs.ts. */
function substitutions(s: State2, interval: boolean): void {
  const minute = s.clockMs / 60000;
  const anyInjured = s.players.some((p) => p.active && p.injured);
  if (!interval && minute < SUB_FROM_MINUTE && !anyInjured) return;
  for (const team of [0, 1] as const) {
    const t = s.teams[team];
    if (t.subsLeft === 0 || t.bench.length === 0) continue;
    const mine = s.players.filter((p) => p.team === team && p.active);
    const injured = mine.filter((p) => p.injured);
    if (t.windowsLeft === 0 && !interval && injured.length === 0) continue;
    const tired = (minute < SUB_FROM_MINUTE && !interval ? [] : mine)
      .filter((p) => p.line !== 'gk' && !p.injured && p.stamina < tiredLimit(minute))
      .sort((a, b) => a.stamina - b.stamina || a.index - b.index);
    const going = [...injured, ...tired].slice(0, Math.min(3, t.subsLeft));
    if (going.length === 0) continue;
    for (const out of going) {
      const pick = bestReplacement(t.bench, out.input, out.line === 'gk');
      const inP = t.bench.splice(pick, 1)[0]!;
      say(s, 'substitution', team, out, null, null, { minute: Math.round(s.clockMs / 60000) });
      const fresh = player(inP, team, out.slot, out.role);
      fresh.cards = 0;
      s.offPitch.push(out);
      s.players[out.index] = fresh;
      s.events[s.events.length - 1]!.otherId = fresh.id;
      t.subsLeft--;
      s.stoppage += STOPPAGE_MS.substitution;
      if (s.owner === out.index) s.owner = fresh.index;
    }
    if (!interval) t.windowsLeft = Math.max(0, t.windowsLeft - 1);
  }
}

// ── Possession ──────────────────────────────────────────────────────────────

/** Gives the ball to `p` at `at` (his team's frame). */
function give(s: State2, p: Player2, at: Pt, won: boolean): void {
  if (won) {
    if (p.team !== s.att) s.counterPress[s.att] = s.clockMs + 5000;
    say(s, 'phaseChange', p.team, p, null, world(p.team, at), { won: 1 });
    s.wonMs = s.clockMs;
  }
  if (p.team !== s.possTeam) {
    s.possTeam = p.team;
    s.possMs = s.clockMs;
    s.shapeAt = world(p.team, at);
    s.shapeMs = s.clockMs;
  }
  s.att = p.team;
  s.owner = p.index;
  s.ball = { x: clamp(at.x, 0.5, LENGTH - 0.5), y: clamp(at.y, 0.5, WIDTH - 0.5) };
  if (won) s.lastPasser = null;
}

const keeperOf = (s: State2, team: 0 | 1) =>
  s.players.find((p) => p.team === team && p.active && p.line === 'gk');

/** Second-last defender, attacking frame: the offside line. */
function offsideLineOf(defs: { at: Pt }[]): number {
  let top = -Infinity;
  let line = -Infinity;
  for (const d of defs) {
    const x = d.at.x;
    if (x > top) {
      line = top;
      top = x;
    } else if (x > line) line = x;
  }
  return line === -Infinity ? LENGTH : line;
}

/**
 * The free man (02 §5.12): a team-mate steps off his marker into space, by his movement off the
 * ball against the marker's marking, never past the offside line. Moves `mates` in place.
 */
function findSpace(
  mates: { p: Player2; at: Pt }[],
  defs: { p: Player2; at: Pt }[],
  c: Player2,
): void {
  const line = offsideLineOf(defs);
  for (const m of mates) {
    if (m.p === c || m.p.line === 'gk' || m.p.line === 'def') continue;
    let near: { p: Player2; at: Pt } | null = null;
    let nd = Infinity;
    for (const d of defs) {
      if (d.p.line === 'gk') continue;
      const q = d2(d.at, m.at);
      if (q < nd) {
        nd = q;
        near = d;
      }
    }
    if (!near) continue;
    const gap = Math.sqrt(nd);
    if (gap >= L2.space || gap < 1e-6) continue;
    const skill = clamp(
      0.5 + L2.spaceSkill * (norm(m.p.attrs.offTheBall) - norm(near.p.attrs.marking)),
      0,
      1,
    );
    const step = (L2.space - gap) * skill;
    const x = m.at.x + ((m.at.x - near.at.x) / gap) * step;
    m.at = {
      x: clamp(Math.min(x, Math.max(m.at.x, line - 0.5)), 0.5, LENGTH - 0.5),
      y: clamp(m.at.y + ((m.at.y - near.at.y) / gap) * step, 0.5, WIDTH - 0.5),
    };
  }
}

/** Pressure on a carrier at `at` (attacking frame) from the nearest defender, 0..1. */
/** Share of a plan's press left with the ball at attacking `x`: whole up to 70 m, none at L2.pressFade. */
const fade = (x: number) => clamp((L2.pressFade - x) / (L2.pressFade - 70), 0, 1);

function pressureAt(s: State2, at: Pt, defs: { p: Player2; at: Pt }[], planShare = 1): number {
  const D = other(s.att);
  const t = s.plans[D].team;
  let best = Infinity;
  // A defender behind the ball is chasing, not closing: he counts as twice as far.
  for (const d of defs)
    if (d.p.line !== 'gk') best = Math.min(best, dist(d.at, at) * (d.at.x < at.x - 1 ? 2 : 1));
  // The plan's press and block shape where a side engages; near its own goal a pressing side
  // defends like any other (a sitting one is already there) (L2.pressFade: the attacking x where the plan's part is gone).
  const plan =
    L2.pressStep * (t.pressIntensity - 3) +
    (t.block === 'high' ? L2.pressStep : t.block === 'low' ? -L2.pressStep : 0);
  const step =
    L2.pressStep * 2 +
    planShare * (plan > 0 ? plan * fade(at.x) : plan) +
    (s.counterPress[D] > s.clockMs && t.onLoss === 'counterPress' ? L2.counterPressStep : 0);
  return clamp(1 - (best - step) / L2.pressRange, 0, 1);
}

const nearest = (list: { p: Player2; at: Pt }[], at: Pt, skipKeeper = true) => {
  let best: { p: Player2; at: Pt } | null = null;
  let bd = Infinity;
  for (const o of list) {
    if (skipKeeper && o.p.line === 'gk') continue;
    const d = d2(o.at, at);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best!;
};

/** Sixteen unit directions (cos, sin of k·22.5°), exact to the last bit in every engine. */
const DIRS: [number, number][] = [
  [1, 0],
  [0.9238795325112867, 0.3826834323650898],
  [0.7071067811865476, 0.7071067811865476],
  [0.3826834323650898, 0.9238795325112867],
  [0, 1],
  [-0.3826834323650898, 0.9238795325112867],
  [-0.7071067811865476, 0.7071067811865476],
  [-0.9238795325112867, 0.3826834323650898],
  [-1, 0],
  [-0.9238795325112867, -0.3826834323650898],
  [-0.7071067811865476, -0.7071067811865476],
  [-0.3826834323650898, -0.9238795325112867],
  [0, -1],
  [0.3826834323650898, -0.9238795325112867],
  [0.7071067811865476, -0.7071067811865476],
  [0.9238795325112867, -0.3826834323650898],
];

/** Who steps in: the nearest defender, or the second nearest a third of the time; a booked one less (02 §6.5). */
function challenger(s: State2, defs: { p: Player2; at: Pt }[], at: Pt) {
  const order = defs
    .filter((d) => d.p.line !== 'gk')
    // As pressureAt: one behind the ball is chasing and counts as twice as far (four times in d²).
    .map((d) => ({ d, k: d2(d.at, at) * (d.p.cards === 1 ? 2 : 1) * (d.at.x < at.x - 1 ? 4 : 1) }))
    .sort((x, y) => x.k - y.k || x.d.p.index - y.d.p.index);
  return order.length > 1 && next(s.r.execution) < 0.33 ? order[1]!.d : order[0]!.d;
}

type Kind = 'pass' | 'through' | 'long' | 'over' | 'carry' | 'shot' | 'cross';
interface Option {
  kind: Kind;
  to: Player2 | null;
  at: Pt;
  p: number;
  u: number;
  /** Carry: chance the defender in `to` gets to the carrier. */
  threat?: number;
}

/** One action of the carrier: a challenge, then pass, carry, cross or shot. */
function act(s: State2): void {
  // One draw per player: a direction out of 16 and a distance up to L2.jitter.
  for (let k = 0; k < 22; k++) {
    const u = next(s.r.decision) * 16;
    const i = Math.floor(u);
    const r = (u - i) * L2.jitter;
    s.jit[2 * k] = DIRS[i]![0] * r;
    s.jit[2 * k + 1] = DIRS[i]![1] * r;
  }
  const A = s.att;
  const D = other(A);
  const c = s.players[s.owner]!;
  if (!c.active) {
    const mate = placed(s, A).find((m) => m.p.active)!;
    give(s, mate.p, mate.at, false);
    return;
  }
  // The defending shape trails the ball: after a long ball it is still upfield (research 13 §3).
  const wb = world(A, s.ball);
  const step = (L2.shapeSpeed * (s.clockMs - s.shapeMs)) / 1000;
  s.shapeMs = s.clockMs;
  const gap = wb.x - s.shapeAt.x;
  s.shapeAt = { x: Math.abs(gap) <= step ? wb.x : s.shapeAt.x + Math.sign(gap) * step, y: wb.y };
  const mates = placed(s, A);
  const defs = placed(s, D);
  findSpace(mates, defs, c);
  const pressure = pressureAt(s, s.ball, defs);
  const plan = s.plans[A].team;
  // A counter attacks a defence caught short (research 13 §3): only while fewer than
  // L2.counterBack of the other side's outfield players are goal-side of the ball.
  const goalSide = defs.filter((d) => d.p.line !== 'gk' && d.at.x > s.ball.x).length;
  const fresh = s.clockMs - s.wonMs < 6000;
  const counter = plan.onWin === 'counter' && fresh && goalSide < L2.counterBack;
  // Space behind a defence caught short (research 13 §3): just after winning the ball, the fewer
  // of them goal-side, the more a forward pass finds open grass. A side set to counter goes
  // for it; one set to keep the ball takes half of it.
  const open = fresh
    ? (Math.max(0, L2.counterBack - goalSide) / L2.counterBack) *
      (plan.onWin === 'counter' ? 1 : 0.5)
    : 0;
  // How well the nearest defender presses with the others (research 13 §1).
  const sync = nearest(defs, s.ball).p.k.sync;
  // A defender close enough challenges before the carrier settles (02 §6).
  if (
    c.line !== 'gk' &&
    next(s.r.execution) <
      L2.challenge *
        pressureAt(s, s.ball, defs, L2.pressChallenge) *
        (0.7 + 0.6 * sync) *
        (1.3 - c.k.resist)
  ) {
    const d = challenger(s, defs, s.ball);
    play(s, A, 1);
    if (!inBox(s.ball) && tacticalStop(s, d.p, defs)) return foul(s, d.p, c, true);
    // As level 1 (match/engine.ts tackles): from behind is harder and fouls more; a booked
    // player goes in more carefully.
    const behind = d.at.x < s.ball.x - 0.3;
    const careful = d.p.cards === 1 ? 0.6 : 1;
    if (next(s.r.execution) < tackleOdds(d.p.k.tack, c.k.tackD, behind)) {
      if (
        next(s.r.referee) <
        L2.foulRate * foulChance(d.p, behind, true) * careful * boxCare(s.ball)
      )
        return foul(s, d.p, c, false, s.ball, true, behind);
      return tackleWins(s, d.p, c);
    }
    if (
      next(s.r.referee) <
      L2.foulRate * foulChance(d.p, behind, false) * careful * boxCare(s.ball)
    )
      return foul(s, d.p, c, false, s.ball, false, behind);
    say(s, 'tackle', D, d.p, c, world(A, s.ball), { won: 0 });
  }
  const options = choices(s, c, mates, defs, pressure, counter, open);
  const noise = L2.noise * (1.1 - norm(c.attrs.decisions));
  let best = options[0]!;
  let bu = -Infinity;
  for (const o of options) {
    // Uniform noise of unit variance: one draw per option.
    const u = o.u + noise * (next(s.r.decision) - 0.5) * 3.4641;
    if (u > bu) {
      bu = u;
      best = o;
    }
  }
  const settle = settleSeconds(plan.tempo, c.attrs, pressure, counter) * L2.timeScale;
  switch (best.kind) {
    case 'shot':
      play(s, A, settle * 0.6);
      return shoot(s, c, s.ball, { pressure, counter, defs });
    case 'cross':
      play(s, A, settle);
      return cross(s, c, s.ball, defs, mates, false);
    case 'carry':
      return carry(s, c, best, defs);
    default:
      return pass(s, c, best, settle, defs);
  }
}

function choices(
  s: State2,
  c: Player2,
  mates: { p: Player2; at: Pt }[],
  defs: { p: Player2; at: Pt }[],
  pressure: number,
  counter: boolean,
  open = 0,
): Option[] {
  const A = s.att;
  const t = s.plans[A].team;
  const b = s.ball;
  const out: Option[] = [];
  const here = valueAt(b.x, b.y);
  // Patience runs out: the longer a possession goes without a way through, the more risk the
  // carrier takes (a block that is circulated against still has to be broken).
  const patience = Math.max(L2.patienceFloor, 1 - (s.clockMs - s.possMs) / (L2.patience * 1000));
  const lossK = L2.lossWeight * (1.3 - 0.1 * t.risk) * patience;
  const edge = homeEdge(s.crowd, A);
  const keeper = c.line === 'gk';
  const traits = c.input.traits;
  // Second-last defender: the offside line, attacking frame.
  const line = offsideLineOf(defs);
  // A block that sits holds its line and lets the ball in front of it; a pressing one steps out
  // to the receiver (research 13 §1).
  const dt = s.plans[other(A)].team;
  const engageBy =
    (L2.closeEngage *
      ((dt.pressIntensity - 3) / 2 + (dt.block === 'high' ? 1 : dt.block === 'low' ? -1 : 0))) /
    2;
  // Grass behind the line for a ball in behind: none against a deep block, plenty behind a high one.
  const behind = L2.throughSpace * clamp((LENGTH - line - 35) / 30, -1, 1);
  for (const m of mates) {
    if (m.p === c) continue;
    const d = dist(b, m.at);
    if (d < 4 || d > 45) continue;
    const long = d > 30;
    if (keeper && m.p.line === 'gk') continue;
    let lane = 0;
    let recv = 0;
    const R = L2.laneRadius;
    // How hard the defence steps out to this receiver (a sitting block lets the ball in front).
    const eng = Math.max(0.2, 1 + (engageBy > 0 ? engageBy * fade(m.at.x) : engageBy));
    const closeBase = (d / L2.passSpeed + 0.3) * L2.closeSpeed * eng;
    const loX = Math.min(b.x, m.at.x) - R;
    const hiX = Math.max(b.x, m.at.x) + R;
    const loY = Math.min(b.y, m.at.y) - R;
    const hiY = Math.max(b.y, m.at.y) + R;
    for (const o of defs) {
      if (o.p.line === 'gk') continue;
      // Outside the box around the line, a defender is at least R from it: no threat.
      const q = o.at;
      // Only a defender along the line can cut it: not one behind the passer.
      if (q.x >= loX && q.x <= hiX && q.y >= loY && q.y <= hiY && along(q, b, m.at) > 0.15)
        lane += Math.max(0, 1 - segDist(q, b, m.at) / R) * o.p.k.antic;
      // While the ball travels the marker closes in (reading the pass: anticipation).
      const close = closeBase * o.p.k.antic;
      const gap = dist(q, m.at) - close;
      if (gap < L2.recvRadius) recv = Math.max(recv, 1 - Math.max(0, gap) / L2.recvRadius);
    }
    const sigma = passSigma(c.k.pass, c.k.resist, pressure, d, c.stamina, edge);
    const fwd = m.at.x - b.x;
    let fail =
      L2.passBase +
      L2.passLane * lane +
      L2.passRecv * recv +
      (L2.passError * sigma * d) / 3 +
      (L2.passForward * Math.min(1, eng) * Math.max(0, fwd)) / 20 +
      L2.passFinal * Math.max(0, (m.at.x - 70) / 35);
    const kind: Kind = long ? 'long' : 'pass';
    if (long) {
      // A long ball is contested in the air or in a race at the target (02 §6.3).
      const marker = nearest(defs, m.at);
      const air = m.p.k.air - marker.p.k.air;
      fail = Math.max(fail, 1 - contest(air, -0.05, 0.12) * (L2.longLand - sigma * 2));
    }
    if (fwd > 0) fail *= 1 - L2.spaceBehind * open;
    const p = clamp(1 - fail, 0.02, 0.99);
    const gain = valueAt(m.at.x, m.at.y) * (1 - 0.35 * recv);
    let u = p * gain - (1 - p) * lossK * valueAt(LENGTH - m.at.x, WIDTH - m.at.y) - here * 0.2;
    // The plan's way forward tilts the choice a little (per metre gained, or by lane).
    const tilt = L2.progression;
    u += fwd * (t.progression === 'vertical' ? tilt : t.progression === 'circulate' ? -tilt : 0);
    if (t.progression === 'wide' && Math.abs(m.at.y - WIDTH / 2) > 20) u += tilt * 15;
    if (t.progression === 'central' && Math.abs(m.at.y - WIDTH / 2) < 12) u += tilt * 15;
    if (long) {
      u += t.buildUp === 'long' ? 0.006 : t.buildUp === 'short' ? -0.006 : 0;
      if (c.line === 'def' || keeper)
        u += L2.longRelief * pressure + (keeper ? L2.longRelief * 0.5 : 0);
      u += L2.longBias;
    }
    if (traits.includes('playsSimple') && d < 20) u += 0.002;
    out.push({ kind, to: m.p, at: m.at, p, u });
    // Run in behind: a forward near the line is sent through (02 §5.4 through ball).
    if (
      m.p.line !== 'def' &&
      m.p.line !== 'gk' &&
      m.at.x > line - 6 &&
      line < LENGTH - 8 &&
      !keeper
    ) {
      const into = { x: Math.min(LENGTH - 6, line + 7), y: m.at.y };
      const chaser = nearest(defs, into);
      const race = contest(m.p.k.run - chaser.p.k.chase, 0.08, L2.raceSpread);
      const vision = c.k.vision;
      const pt = clamp(race * (0.45 + 0.5 * vision) + behind - L2.passError * sigma, 0.02, 0.95);
      out.push({
        kind: 'through',
        to: m.p,
        at: into,
        p: pt,
        u:
          pt * valueAt(into.x, into.y) -
          (1 - pt) * lossK * valueAt(LENGTH - into.x, WIDTH - into.y) -
          here * 0.2 +
          L2.bias * (t.finalThird.throughBalls - 3),
      });
    }
    // Ball over the top (level 1 `over`): from deep, lofted into the space behind a high line,
    // for a forward to run onto. Long passing makes it land; the race decides who gets there.
    if (m.p.line === 'att' && line < 75 && m.at.x > line - 10 && b.x < line - 15) {
      const into = { x: Math.min(LENGTH - 8, line + 12), y: m.at.y };
      const chaser = nearest(defs, into);
      const race = contest(m.p.k.run - chaser.p.k.chase, 0.08, L2.raceSpread);
      const pt = clamp(
        race * (L2.overBase + 0.5 * c.k.long) + behind - L2.passError * sigma,
        0.02,
        0.9,
      );
      out.push({
        kind: 'over',
        to: m.p,
        at: into,
        p: pt,
        u:
          pt * valueAt(into.x, into.y) -
          (1 - pt) * lossK * valueAt(LENGTH - into.x, WIDTH - into.y) -
          here * 0.2 +
          L2.overBias +
          (t.buildUp === 'long' ? 0.004 : 0),
      });
    }
  }
  if (!keeper) {
    // Carry forward, inside if the player cuts in.
    const toward = traits.includes('cutsInside') ? 0.35 : 0.15;
    const at = {
      x: Math.min(LENGTH - 2, b.x + L2.carry),
      y: b.y + (WIDTH / 2 - b.y) * toward,
    };
    // The defender most in the way: the presser at the ball or one across the carry.
    let d = nearest(defs, b);
    let threat = pressure;
    for (const o of defs) {
      if (o.p.line === 'gk') continue;
      const w = Math.max(0, 1 - segDist(o.at, b, at) / L2.laneRadius);
      if (w > threat) {
        threat = w;
        d = o;
      }
    }
    const beat = dribbleOdds(c.k.drib, d.p.k.dribD);
    const p = clamp(1 - threat + threat * beat, 0.05, 0.99);
    let u =
      p * valueAt(at.x, at.y) -
      (1 - p) * lossK * valueAt(LENGTH - b.x, WIDTH - b.y) -
      here * 0.2 +
      L2.carryBias;
    if (traits.includes('triesDribbles')) u += 0.003;
    if (traits.includes('holdsBall')) u += 0.001;
    out.push({ kind: 'carry', to: d.p, at, p, u, threat });
    if (b.x > 68) {
      const chance = xg({
        x: b.x,
        y: b.y,
        header: false,
        pressure,
        keeperOut: 0,
        afterCross: false,
        counter,
        directFreeKick: false,
      });
      const far = b.x < LENGTH - 18;
      out.push({
        kind: 'shot',
        to: null,
        at: b,
        p: 1,
        u:
          chance -
          L2.shotBar -
          here * 0.2 +
          (b.x < LENGTH - 20 ? L2.farShot : 0) +
          (far
            ? L2.bias * (t.finalThird.shootFromDistance - 3) +
              (traits.includes('shootsFromDistance') ? 0.004 : 0)
            : 0),
      });
    }
    if (b.x > 72 && Math.abs(b.y - WIDTH / 2) > 13) {
      const skill = c.k.cross;
      out.push({
        kind: 'cross',
        to: null,
        at: { x: LENGTH - 8, y: WIDTH / 2 },
        p: skill,
        u: 0.045 * skill * L2.crossAccuracy * 2 - here * 0.2 + L2.bias * (t.finalThird.crosses - 3),
      });
    }
  }
  // A keeper with nobody in range (all too close or too far) hoofs it to the furthest mate.
  if (out.length === 0) {
    const m = mates.reduce((a, x) => (x.p !== c && (a.p === c || x.at.x > a.at.x) ? x : a));
    out.push({ kind: 'long', to: m.p, at: m.at, p: 0.4, u: 0 });
  }
  return out;
}

function pass(
  s: State2,
  c: Player2,
  o: Option,
  settle: number,
  defs: { p: Player2; at: Pt }[],
): void {
  const A = s.att;
  const D = other(A);
  const st = s.teams[A].stats;
  const d = dist(s.ball, o.at);
  play(s, A, settle + d / L2.passSpeed);
  st.passes++;
  // Same codes as level 1 (match/kick.ts): pass 0, through 1, long 2, over 5.
  const kindCode = o.kind === 'pass' ? 0 : o.kind === 'through' ? 1 : o.kind === 'over' ? 5 : 2;
  say(s, 'pass', A, c, o.to, world(A, s.ball), { d: Math.round(d), kind: kindCode });
  const receiver = o.to!;
  // Offside on a ball in behind, or to a forward ahead of the line (02 §6.5).
  if (o.kind === 'through' || o.kind === 'over') {
    const trap = s.plans[D].team.offsideTrap ? 1.5 : 1;
    const p =
      L2.throughOffside *
      trap *
      (1.3 - weighted(receiver.attrs, { offTheBall: 0.5, anticipation: 0.5 }));
    if (next(s.r.referee) < p) {
      s.teams[A].stats.offsides++;
      say(s, 'offside', A, receiver, null, world(A, o.at));
      dead(s, 'freeKick');
      const taker = nearest(placed(s, D), mirror(o.at), false);
      return give(s, taker.p, mirror(o.at), false);
    }
  }
  if (next(s.r.execution) < o.p) {
    st.passesCompleted++;
    c.score += 0.01;
    s.lastPasser = c.index;
    say(s, 'reception', A, receiver, c, world(A, o.at));
    return give(s, receiver, o.at, false);
  }
  if (o.kind === 'long' && o.at.x > LENGTH - 15 && next(s.r.execution) < 0.5) {
    // Overhit past the last line: a goal kick.
    say(s, 'goalKick', D, null, null, world(D, { x: 5.5, y: WIDTH / 2 }));
    dead(s, 'goalKick');
    return goalKick(s, D);
  }
  if (next(s.r.execution) < (o.kind === 'long' ? L2.longOut : L2.outOfPlay)) {
    // Out for a throw-in to the other side.
    const at = { x: o.at.x, y: o.at.y < WIDTH / 2 ? 0.5 : WIDTH - 0.5 };
    say(s, 'throwIn', D, null, null, world(A, at));
    dead(s, 'throwIn');
    const taker = nearest(placed(s, D), mirror(at));
    return give(s, taker.p, mirror(at), false);
  }
  // A long ball lost in the air often drops loose: first to it, by distance (02 §6.3).
  if (o.kind === 'long' && next(s.r.execution) < L2.longLoose) {
    const m = nearest(
      placed(s, A).filter((x) => x.p !== c),
      o.at,
    );
    const dd = nearest(defs, o.at);
    const dm = dist(m.at, o.at);
    const dD = dist(dd.at, o.at);
    if (next(s.r.execution) < dD / (dm + dD || 1)) return give(s, m.p, m.at, false);
    return give(s, dd.p, mirror(dd.at), true);
  }
  const cutter = nearest(defs, o.at);
  say(s, 'interception', D, cutter.p, c, world(A, cutter.at));
  cutter.p.score += 0.1;
  give(s, cutter.p, mirror(cutter.at), true);
}

function carry(s: State2, c: Player2, o: Option, defs: { p: Player2; at: Pt }[]): void {
  const A = s.att;
  const d = { p: o.to! };
  play(s, A, L2.carry / (L2.carrySpeed * (0.8 + 0.4 * norm(c.attrs.pace))));
  if (next(s.r.execution) < (o.threat ?? 0)) {
    // Take the defender on (02 §6 drible × desarme).
    if (next(s.r.execution) < dribbleOdds(c.k.drib, d.p.k.dribD)) {
      say(s, 'dribble', A, c, d.p, world(A, s.ball), { won: 1 });
      c.score += 0.15;
      if (
        next(s.r.referee) <
        L2.foulRate * beatenFoulChance(d.p) * (d.p.cards === 1 ? 0.6 : 1) * boxCare(o.at)
      )
        return foul(s, d.p, c, false, o.at, false);
    } else {
      say(s, 'dribble', A, c, d.p, world(A, s.ball), { won: 0 });
      if (next(s.r.referee) < L2.foulRate * foulChance(d.p, false, true) * boxCare(s.ball))
        return foul(s, d.p, c, false, s.ball, true);
      return tackleWins(s, d.p, c);
    }
  }
  if (!inBox(s.ball) && tacticalStop(s, d.p, defs)) return foul(s, d.p, c, true);
  s.ball = o.at;
}

/**
 * A won tackle, as level 1 (match/engine.ts tackleWins): near the touchline it often goes out
 * for a throw-in, near the goal line for a corner; otherwise the tackler keeps it more often the
 * better his technique, or it runs loose to whoever is nearer (a duel does not always give a
 * clean ball).
 */
function tackleWins(s: State2, d: Player2, c: Player2): void {
  const A = c.team;
  const D = d.team;
  const at = s.ball;
  say(s, 'tackle', D, d, c, world(A, at), { won: 1 });
  d.score += 0.12;
  if (Math.min(at.y, WIDTH - at.y) < 8 && next(s.r.execution) < 0.45) {
    const out = { x: at.x, y: at.y < WIDTH / 2 ? 0.5 : WIDTH - 0.5 };
    say(s, 'throwIn', A, null, null, world(A, out));
    dead(s, 'throwIn');
    return give(s, nearest(placed(s, A), out).p, out, false);
  }
  if (at.x > LENGTH - 12 && next(s.r.execution) < 0.5) return corner(s, A, at.y);
  if (next(s.r.execution) < 0.55 + 0.3 * norm(d.attrs.technique))
    return give(s, d, mirror(at), true);
  // Loose: the nearer of the two sides' closest players, by a coin weighted on distance.
  const loose = {
    x: at.x + (next(s.r.execution) - 0.5) * 6,
    y: at.y + (next(s.r.execution) - 0.5) * 6,
  };
  const m = nearest(
    placed(s, A).filter((x) => x.p !== c),
    loose,
  );
  const o = nearest(placed(s, D), loose);
  const dm = dist(m.at, loose);
  const dd = dist(o.at, loose);
  if (next(s.r.execution) < dd / (dm + dd || 1)) return give(s, m.p, loose, false);
  give(s, o.p, mirror(loose), true);
}

/**
 * Tactical foul, as level 1 (match/engine.ts tacticalFoul, research 18 §1.2 C): a counter
 * just started, running at the defenders' half with few of them goal-side; a player who
 * reads the game stops it, much less so on a yellow.
 */
function tacticalStop(s: State2, d: Player2, defs: { p: Player2; at: Pt }[]): boolean {
  if (s.clockMs - s.wonMs > 8000 || s.ball.x < 45) return false;
  const goalSide = defs.filter((x) => x.p.line !== 'gk' && x.at.x > s.ball.x).length;
  if (goalSide > 4) return false;
  const p =
    L2.tacticalFoul *
    (0.4 + 0.6 * norm(d.attrs.tacticalReading)) *
    (d.cards === 1 ? 0.2 : 1) *
    (0.6 + 0.4 * (1 - goalSide / 4));
  return next(s.r.referee) < p;
}

function foul(
  s: State2,
  d: Player2,
  c: Player2,
  tactical: boolean,
  at: Pt = s.ball,
  playedBall = false,
  behind = false,
): void {
  const A = c.team;
  s.teams[d.team].stats.fouls++;
  // Same reading as level 1 (match/engine.ts foul): opponents goal-side of the ball, keeper in.
  const goalSide = placed(s, d.team).filter((x) => x.at.x > at.x && x.p !== d).length;
  say(s, 'foul', d.team, d, c, world(A, at), {
    behind: behind ? 1 : 0,
    ...(tactical ? { tactical: 1 } : {}),
  });
  const card = cardFor(
    s.strictness,
    d,
    {
      behind,
      promising: at.x > 70 || (at.x > 40 && goalSide <= 3),
      lastMan: goalSide === 0 && at.x > 75 && Math.abs(at.y - WIDTH / 2) < 20,
      tactical,
      playedBall,
    },
    next(s.r.referee),
    next(s.r.referee),
  );
  if (card) {
    const prev = d.cards;
    const red = card === 2 || prev === 1;
    d.cards = red ? 2 : 1;
    say(s, 'card', d.team, d, null, world(A, at), {
      card: red ? 2 : 1,
      second: prev === 1 ? 1 : 0,
    });
    s.stoppage += STOPPAGE_MS.card;
    if (red) {
      s.teams[d.team].stats.redCards++;
      if (prev === 1) s.teams[d.team].stats.yellowCards++;
      d.active = false;
    } else s.teams[d.team].stats.yellowCards++;
  }
  d.score -= card === 2 ? 1.5 : card === 1 ? 0.3 : 0.05;
  if (next(s.r.injury) < CONTACT_PER_FOUL) injure(s, c, true);
  if (inBox(at)) {
    say(s, 'penalty', A, c, null, world(A, at));
    dead(s, 'penalty');
    const taker = takerOf(s, A, 'penalty');
    return shoot(s, taker, { x: LENGTH - 11, y: WIDTH / 2 }, { penalty: true });
  }
  say(s, 'freeKick', A, null, null, world(A, at));
  dead(s, 'freeKick');
  if (at.x > LENGTH - 30 && Math.abs(at.y - WIDTH / 2) < 16) {
    const taker = takerOf(s, A, 'freeKickDirect');
    if (next(s.r.decision) < L2.directShot) return shoot(s, taker, at, { directFreeKick: true });
    return cross(s, taker, at, placed(s, other(A)), placed(s, A), true);
  }
  if (at.x > LENGTH - 35) {
    const taker = takerOf(s, A, 'freeKickWide');
    return cross(s, taker, at, placed(s, other(A)), placed(s, A), true);
  }
  give(s, c.active ? c : takerOf(s, A, 'freeKickIndirect'), at, false);
}

function takerOf(s: State2, team: 0 | 1, kind: keyof TacticalPlan['setPieces']): Player2 {
  const ids = s.plans[team].setPieces[kind] ?? [];
  const on = s.players.filter((p) => p.team === team && p.active && p.line !== 'gk');
  for (const id of ids) {
    const p = on.find((x) => x.id === id);
    if (p) return p;
  }
  return on.reduce((a, b) =>
    weighted(b.attrs, { setPieces: 0.5, finishing: 0.3, technique: 0.2 }) >
    weighted(a.attrs, { setPieces: 0.5, finishing: 0.3, technique: 0.2 })
      ? b
      : a,
  );
}

/** Cross or set piece into the box: an aerial duel, then a header (02 §6.3). */
function cross(
  s: State2,
  c: Player2,
  from: Pt,
  defs: { p: Player2; at: Pt }[],
  mates: { p: Player2; at: Pt }[],
  setPiece: boolean,
): void {
  const A = s.att === c.team ? s.att : c.team;
  const D = other(A);
  say(s, 'pass', A, c, null, world(A, from), { cross: 1 });
  const closer = nearest(defs, from);
  if (!setPiece && dist(closer.at, from) < 4 && next(s.r.execution) < 0.25) {
    say(s, 'save', D, closer.p, c, world(A, closer.at), { block: 1 });
    if (next(s.r.execution) < BLOCK_BEHIND) return corner(s, A, from.y);
    return give(s, closer.p, mirror(closer.at), true);
  }
  const skill = c.k.cross;
  const box = s.plans[A].team.finalThird.boxPresence;
  // Runners in the box: the forwards, more midfielders with box presence; at set pieces the centre-backs too.
  const runners = mates
    .filter(
      (m) =>
        m.p !== c &&
        m.p.line !== 'gk' &&
        (m.p.line === 'att' ||
          (m.p.line === 'mid' && box >= 3) ||
          (setPiece && m.p.line === 'def')),
    )
    .map((m) => ({ p: m.p, a: m.p.k.air + 0.05 * gaussian(s.ue) }))
    .sort((x, y) => y.a - x.a);
  const markers = defs
    .filter((d) => d.p.line !== 'gk')
    .map((d) => ({ p: d.p, a: d.p.k.air }))
    .sort((x, y) => y.a - x.a);
  const target = runners[0];
  const marker = markers[0];
  if (!target || !marker || next(s.r.execution) > L2.crossAccuracy * (0.6 + 0.8 * skill)) {
    const k = keeperOf(s, D);
    const to = k && next(s.r.execution) < 0.4 ? k : (marker?.p ?? closer.p);
    if (to === k) say(s, 'save', D, k!, null, world(D, { x: 5, y: WIDTH / 2 }), { claim: 1 });
    return give(s, to, { x: to === k ? 6 : 14, y: WIDTH - from.y }, true);
  }
  const win = contest(target.a - marker.a, L2.aerialDifficulty, 0.12);
  if (next(s.r.execution) < win) {
    if (
      next(s.r.referee) <
      L2.foulRate * aerialFoulChance(marker.p) * boxCare({ x: LENGTH - 8, y: WIDTH / 2 })
    )
      return foul(s, marker.p, target.p, false, { x: LENGTH - 8, y: WIDTH / 2 });
    s.lastPasser = c.index;
    const at = {
      x: LENGTH - 6 - 6 * next(s.r.execution),
      y: WIDTH / 2 + (next(s.r.execution) - 0.5) * 12,
    };
    return shoot(s, target.p, at, { header: true, afterCross: true });
  }
  // Cleared: behind for a corner, or away.
  if (next(s.r.execution) < L2.clearCorner) return corner(s, A, from.y);
  give(s, marker.p, { x: 18 + 10 * next(s.r.execution), y: WIDTH - from.y }, true);
}

function corner(s: State2, team: 0 | 1, y: number): void {
  s.teams[team].stats.corners++;
  const at = { x: LENGTH - 0.5, y: y < WIDTH / 2 ? 0.5 : WIDTH - 0.5 };
  say(s, 'corner', team, null, null, world(team, at));
  dead(s, 'corner');
  const taker = takerOf(s, team, at.y < WIDTH / 2 ? 'cornerRight' : 'cornerLeft');
  s.att = team;
  s.ball = at;
  cross(s, taker, at, placed(s, other(team)), placed(s, team), true);
}

interface ShotOpts {
  pressure?: number;
  counter?: boolean;
  defs?: { p: Player2; at: Pt }[];
  header?: boolean;
  afterCross?: boolean;
  penalty?: boolean;
  directFreeKick?: boolean;
}

function shoot(s: State2, c: Player2, at: Pt, o: ShotOpts): void {
  const A = c.team;
  const D = other(A);
  s.att = A;
  s.ball = at;
  const defs = o.defs ?? placed(s, D);
  const pressure = o.pressure ?? (o.header ? 0.5 : 0);
  const chance = o.penalty
    ? PENALTY_XG
    : xg({
        x: at.x,
        y: at.y,
        header: !!o.header,
        pressure,
        keeperOut: 0,
        afterCross: !!o.afterCross,
        counter: !!o.counter,
        directFreeKick: !!o.directFreeKick,
      });
  // Bodies between the ball and the goal block part of the shots (xG already counts them).
  let blockers = 0;
  let blocker: Player2 | null = null;
  if (!o.penalty && !o.header)
    for (const d of defs) {
      if (d.p.line === 'gk' || d.at.x <= at.x) continue;
      const w = Math.max(0, 1 - segDist(d.at, at, { x: LENGTH, y: WIDTH / 2 }) / L2.blockRadius);
      if (w > 0 && (!blocker || w > 0.5)) blocker = d.p;
      blockers += w;
    }
  const through = o.penalty || o.header ? 1 : Math.max(0.3, 1 - L2.blockWeight * blockers);
  const keeper = keeperOf(s, D);
  const foot =
    o.header || c.input.preferredFoot === 'both' || next(s.r.execution) > 0.25
      ? 1
      : weakFootError(c.attrs);
  const { pGoal, pOn } = shotOdds({
    chance,
    through,
    header: !!o.header,
    far: at.x < LENGTH - 18,
    penalty: !!o.penalty,
    shooter: c.attrs,
    keeper: keeper?.attrs,
    stamina: c.stamina,
    foot,
    pressure,
    edge: homeEdge(s.crowd, A),
    edgeAgainst: homeEdge(s.crowd, D),
  });
  const st = s.teams[A].stats;
  st.shots++;
  st.xg += chance;
  // As level 1 (match/kick.ts shoot): target and goal are decided at the strike, so a goal
  // scores at chance / through and the bodies in the way stop the rest of the share.
  const onTarget = next(s.r.execution) < pOn;
  const decided = onTarget && next(s.r.execution) < pGoal / pOn;
  const blocked = !o.penalty && !o.header && next(s.r.execution) > through;
  const goal = decided && !blocked;
  if (onTarget) st.shotsOnTarget++;
  const dGoal = dist(at, { x: LENGTH, y: WIDTH / 2 });
  const big = !!o.penalty || dGoal <= 6 || (inBox(at) && through >= 0.95 && pressure < 0.3);
  say(s, 'shot', A, c, null, world(A, at), {
    xg: Math.round(chance * 1000) / 1000,
    psxg: Math.round((onTarget ? pGoal / pOn : 0) * 1000) / 1000,
    onTarget: onTarget ? 1 : 0,
    header: o.header ? 1 : 0,
    penalty: o.penalty ? 1 : 0,
    x: Math.round(at.x),
    ...(big ? { big: 1 } : {}),
    decided: decided ? 1 : 0,
  });
  play(s, A, 1);
  if (goal) {
    s.teams[A].score++;
    st.goals++;
    const assist =
      s.lastPasser !== null && s.lastPasser !== c.index && s.players[s.lastPasser]!.active
        ? s.players[s.lastPasser]!
        : null;
    say(s, 'goal', A, c, assist, world(A, { x: LENGTH, y: WIDTH / 2 }), { own: 0, xg: chance });
    c.score += 1.2;
    if (assist) assist.score += 0.6;
    for (const p of s.players)
      if (p.team === D && p.active && (p.line === 'gk' || p.line === 'def')) p.score -= 0.25;
    dead(s, 'goal');
    return kickOff(s, D);
  }
  if (blocked) {
    const b = blocker ?? nearest(defs, at).p;
    say(s, 'save', D, b, c, world(A, at), { block: 1 });
    b.score += 0.1;
    if (next(s.r.execution) < BLOCK_BEHIND) return corner(s, A, at.y);
    return next(s.r.execution) < 0.5
      ? give(s, b, mirror(at), true)
      : give(s, c, { x: at.x - 4, y: at.y }, false);
  }
  if (!onTarget) {
    say(s, 'save', null, null, null, world(A, { x: LENGTH, y: at.y }), { wide: 1 });
    say(s, 'goalKick', D, null, null, world(D, { x: 5.5, y: WIDTH / 2 }));
    dead(s, 'goalKick');
    return goalKick(s, D);
  }
  if (!keeper) return goalKick(s, D);
  say(s, 'save', D, keeper, c, world(D, { x: 1, y: WIDTH / 2 }), { xg: chance });
  keeper.score += 0.35;
  if (next(s.r.execution) < holdChance(keeper.attrs))
    return give(s, keeper, { x: 5, y: WIDTH / 2 }, true);
  if (next(s.r.execution) < PARRY_WIDE) return corner(s, A, at.y);
  // Rebound in front of goal: first to it.
  const rebound = { x: LENGTH - 9, y: WIDTH / 2 + (next(s.r.execution) - 0.5) * 14 };
  const mate = nearest(placed(s, A), rebound);
  const def = nearest(defs, rebound);
  if (next(s.r.execution) < 0.4) return give(s, mate.p, rebound, false);
  give(s, def.p, mirror(rebound), true);
}

function goalKick(s: State2, team: 0 | 1): void {
  const k = keeperOf(s, team) ?? s.players.find((p) => p.team === team && p.active)!;
  s.att = team;
  give(s, k, { x: 6, y: WIDTH / 2 }, false);
}

function kickOff(s: State2, team: 0 | 1): void {
  s.att = team;
  s.ball = { x: LENGTH / 2, y: WIDTH / 2 };
  const taker =
    s.players.find((p) => p.team === team && p.active && p.line === 'att') ??
    s.players.find((p) => p.team === team && p.active)!;
  give(s, taker, { x: LENGTH / 2, y: WIDTH / 2 }, false);
  s.lastPasser = null;
  s.wonMs = -Infinity;
}

// ── Match ───────────────────────────────────────────────────────────────────

/** Plays a whole match at level 2 (02 §12). Pure: same input, same result. */
export function simulateLevel2(input: MatchInput): MatchResult {
  const s = create(input);
  for (const period of [1, 2] as const) {
    const start = period === 1 ? 0 : 45 * 60000;
    s.clockMs = Math.max(s.clockMs, start);
    const from = s.clockMs;
    s.stoppage = 0;
    say(s, 'periodStart', null, null, null, null, { period });
    if (period === 2) {
      for (const p of s.players) if (p.active) recover(p, 900);
      substitutions(s, true);
    }
    kickOff(s, period === 1 ? 0 : 1);
    dead(s, 'kickOff');
    while (s.clockMs - from < 45 * 60000 + s.stoppage) act(s);
    if (s.body > 0) body(s);
    say(s, 'periodEnd', null, null, null, null, {
      period,
      stoppage: Math.round(s.stoppage / 60000),
    });
  }
  return result(s, input.engineVersion);
}

function result(s: State2, version: number): MatchResult {
  const total = s.teams[0].possessionMs + s.teams[1].possessionMs || 1;
  const stats = s.teams.map((t) => ({
    ...t.stats,
    xg: Math.round(t.stats.xg * 100) / 100,
    possession: Math.round((t.possessionMs / total) * 1000) / 1000,
  })) as MatchResult['stats'];
  return {
    engineVersion: version,
    score: [s.teams[0].score, s.teams[1].score],
    shootout: null,
    stats,
    players: [...s.players, ...s.offPitch].map((p) => ({
      playerId: p.id,
      minutes: Math.min(130, Math.round(p.msOn / 60000)),
      rating: Math.round(Math.min(10, Math.max(0, 6 + p.score)) * 10) / 10,
      stamina: Math.round(p.stamina * 100) / 100,
      distanceM: Math.round(p.distance),
    })),
    events: s.events,
    explanation: explain(s.events, Math.round(s.clockMs / 60000)),
  };
}
