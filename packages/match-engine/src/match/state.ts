/**
 * Full match state of the level 1 engine (MC-031; 02-MATCH-ENGINE.md §3). Plain
 * data only (no Map, no class, no function), so a match can be serialised at
 * any tick and resumed: deserialise and continue = continue directly.
 * Positions are in the world frame; team 1 attacks towards x = 0.
 */
import type {
  MatchEvent,
  MatchInput,
  PlayerInput,
  TeamStats,
  TimedCommand,
} from '../contract';
import type { Ball } from '../ball';
import { CENTER, flip } from '../pitch';
import { fork, rngFrom, type Rng } from '../random';
import type { RoleId } from '../contract';
import type { World, WorldPlayer } from '../world';

export const PERIOD_TICKS = 45 * 60 * 4; // 45 minutes at DT = 0.25 s

export interface MatchPlayer extends WorldPlayer {
  id: string;
  input: PlayerInput;
  cards: 0 | 1 | 2;
  /** Ticks this player was on the pitch, and metres run. */
  ticksOn: number;
  distance: number;
  /** Tick of the next with-ball decision while carrying. */
  decideAt: number;
  /** A defender who just tried a tackle waits until this tick before another. */
  tackleAt: number;
  /** Rating accumulator (MC-042). */
  score: number;
  injured: boolean;
}

export type RestartKind = 'kickOff' | 'throwIn' | 'corner' | 'goalKick' | 'freeKick' | 'penalty';

export interface Restart {
  kind: RestartKind;
  team: 0 | 1;
  /** World-frame spot of the ball. */
  at: { x: number; y: number };
}

export interface Flight {
  ball: Ball;
  /** Who played it, the intended receiver (or null), and what it is. */
  from: number;
  to: number | null;
  kind: 'pass' | 'cross' | 'shot' | 'clear' | 'loose';
  /** Players that cannot touch it this step (the kicker right after the kick). */
  skip: number[];
  /** Attackers in an offside position when it was played (02 §6.5). */
  offside: number[];
  /** Shot already decided past the keeper: he does not reach it (02 §7). */
  beaten: boolean;
  /** Shot data for the event when it ends. */
  shot: { xg: number; event: number } | null;
  /** Cross blocked at the source by this defender (goes behind for a corner). */
  blocked?: number;
}

export interface TeamState {
  score: number;
  subsLeft: number;
  windowsLeft: number;
  bench: PlayerInput[];
  stats: TeamStats;
  possessionTicks: number;
}

export interface MatchState extends World {
  version: number;
  players: MatchPlayer[];
  /** 1, 2 regular halves; 3, 4 extra time. */
  period: number;
  /** Ticks played in this period, and the stoppage time to add (ticks). */
  periodTick: number;
  stoppage: number;
  /** Clock at the start of the current period. */
  periodStartMs: number;
  /** Total match clock in milliseconds, including stoppage. */
  clockMs: number;
  rngs: { decision: Rng; execution: Rng; referee: Rng; injury: Rng };
  flight: Flight | null;
  /** Player in control of the ball (it moves with him), or null. */
  owner: number | null;
  /** Last player to touch the ball, for restarts. */
  lastTouch: number;
  /** Tick the current possession started, and since when the owner holds it. */
  possessionSince: number;
  ownedSince: number;
  restart: Restart | null;
  teams: [TeamState, TeamState];
  events: MatchEvent[];
  /** Players substituted off, kept for their stats. */
  offPitch: MatchPlayer[];
  commands: TimedCommand[];
  input: Pick<MatchInput, 'conditions' | 'rules' | 'seed' | 'engineVersion'>;
  finished: boolean;
}

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

export function createMatch(input: MatchInput, commands: TimedCommand[] = []): MatchState {
  const root = rngFrom(input.seed);
  const players: MatchPlayer[] = [];
  for (const team of [0, 1] as const) {
    const t = input.teams[team];
    for (let slot = 0; slot < 11; slot++) {
      const p = t.players[slot]!;
      const home = t.plan.shapes.outOfPossession[slot]!;
      const pos = flip(team, { x: Math.min(home.x, 50), y: home.y });
      players.push({
        index: team * 11 + slot,
        team,
        slot,
        role: t.plan.roles[slot] as RoleId,
        attrs: p.attributes,
        pos,
        vel: { x: 0, y: 0 },
        stamina: p.condition,
        active: true,
        pace: p.attributes.pace,
        acceleration: p.attributes.acceleration,
        target: { ...pos },
        intent: 'anchor',
        id: p.id,
        input: p,
        cards: 0,
        ticksOn: 0,
        distance: 0,
        decideAt: 0,
        tackleAt: 0,
        score: 0,
        injured: false,
      });
    }
  }
  const team = (k: 0 | 1): TeamState => ({
    score: 0,
    subsLeft: input.rules.substitutions,
    windowsLeft: input.rules.substitutionWindows,
    bench: input.teams[k].players.slice(11),
    stats: emptyStats(),
    possessionTicks: 0,
  });
  return {
    version: input.engineVersion,
    tick: 0,
    rng: fork(root, 'coordination'),
    rngs: {
      decision: fork(root, 'decision'),
      execution: fork(root, 'execution'),
      referee: fork(root, 'referee'),
      injury: fork(root, 'injury'),
    },
    players,
    plans: [structuredClone(input.teams[0].plan), structuredClone(input.teams[1].plan)],
    memory: [{ owners: {} }, { owners: {} }],
    ball: { pos: { ...CENTER }, focal: { ...CENTER }, holder: null, possession: 0 },
    familiarity: [
      mean(input.teams[0].players.slice(0, 11).map((p) => p.familiarity)),
      mean(input.teams[1].players.slice(0, 11).map((p) => p.familiarity)),
    ],
    assignments: [[], []],
    log: [],
    period: 1,
    periodTick: 0,
    stoppage: 0,
    periodStartMs: 0,
    clockMs: 0,
    flight: null,
    owner: null,
    lastTouch: 9,
    possessionSince: 0,
    ownedSince: 0,
    restart: { kind: 'kickOff', team: 0, at: { ...CENTER } },
    teams: [team(0), team(1)],
    events: [],
    offPitch: [],
    commands: [...commands].sort((a, b) => a.atMs - b.atMs),
    input: {
      conditions: input.conditions,
      rules: input.rules,
      seed: input.seed,
      engineVersion: input.engineVersion,
    },
    finished: false,
  };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export const serialize = (s: MatchState): string => JSON.stringify(s);
export const deserialize = (json: string): MatchState => JSON.parse(json) as MatchState;
