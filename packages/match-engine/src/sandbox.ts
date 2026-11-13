/**
 * Tactical sandbox (02-MATCH-ENGINE.md §14, TASKS.md phase 2): 22 test players,
 * a ball passed around by a seeded script, shapes that follow the ball and
 * three instructions that move anchors. No duels, shots or referee yet.
 */
import { LENGTH, WIDTH, clamp, dist, flip, type Vec2 } from './pitch';
import { DT, moveTowards, separate, type Mover } from './movement';
import { between, fork, next, pick, rngFrom, type Rng } from './random';
import { DEFAULT_INSTRUCTIONS, SHAPES, SLOTS, anchor, type Instructions } from './shape';

const BALL_SPEED = 15;
/** Share of passes that the scripted ball gives to the other team. */
const TURNOVER = 0.15;

export interface SandboxState {
  tick: number;
  rng: Rng;
  /** Index 0–10 team 0, 11–21 team 1; slot = index % 11. World frame. */
  players: Mover[];
  instructions: [Instructions, Instructions];
  ball: Vec2;
  /** Player index holding the ball, or the receiver while it flies. */
  holder: number;
  /** Tick at which the holder releases the ball. */
  releaseAt: number;
  flight: { from: Vec2; startTick: number; endTick: number } | null;
}

export const teamOf = (index: number): 0 | 1 => (index < SLOTS ? 0 : 1);

export function createSandbox(
  seed: number,
  instructions: [Instructions, Instructions] = [DEFAULT_INSTRUCTIONS, DEFAULT_INSTRUCTIONS],
): SandboxState {
  const rng = rngFrom(seed);
  const attrs = fork(rng, 'players');
  const players: Mover[] = Array.from({ length: SLOTS * 2 }, (_, i) => ({
    pos: flip(teamOf(i), SHAPES[i < SLOTS ? 'in' : 'out'][i % SLOTS]!),
    vel: { x: 0, y: 0 },
    pace: Math.round(between(attrs, 50, 90)),
    acceleration: Math.round(between(attrs, 50, 90)),
  }));
  const holder = 5;
  return {
    tick: 0,
    rng,
    players,
    instructions,
    ball: { ...players[holder]!.pos },
    holder,
    releaseAt: 8,
    flight: null,
  };
}

function pass(s: SandboxState): void {
  const team = teamOf(s.holder);
  const mates = [...Array(SLOTS).keys()].map((k) => team * SLOTS + k).filter((i) => i !== s.holder);
  let target = mates[pick(s.rng, mates.length)]!;
  if (next(s.rng) < TURNOVER) {
    // Scripted interception: the opponent nearest to the intended receiver gets it.
    const to = s.players[target]!.pos;
    let best = -1;
    for (let i = (1 - team) * SLOTS; i < (2 - team) * SLOTS; i++)
      if (best < 0 || dist(s.players[i]!.pos, to) < dist(s.players[best]!.pos, to)) best = i;
    target = best;
  }
  const from = { ...s.ball };
  const ticks = Math.max(1, Math.ceil(dist(from, s.players[target]!.pos) / BALL_SPEED / DT));
  s.flight = { from, startTick: s.tick, endTick: s.tick + ticks };
  s.holder = target;
}

/** Advances the sandbox by one step of DT seconds. Mutates `s`. */
export function step(s: SandboxState): void {
  s.tick++;
  const owner = teamOf(s.holder);

  for (let i = 0; i < s.players.length; i++) {
    const team = teamOf(i);
    const want = anchor(
      i % SLOTS,
      team === owner ? 'in' : 'out',
      flip(team, s.ball),
      s.instructions[team],
    );
    moveTowards(s.players[i]!, flip(team, want));
  }
  separate(s.players);
  for (const p of s.players) {
    p.pos.x = clamp(p.pos.x, 0, LENGTH);
    p.pos.y = clamp(p.pos.y, 0, WIDTH);
  }

  const receiver = s.players[s.holder]!.pos;
  if (s.flight) {
    const f = s.flight;
    const t = (s.tick - f.startTick) / (f.endTick - f.startTick);
    if (t >= 1) {
      s.flight = null;
      s.ball = { ...receiver };
      s.releaseAt = s.tick + Math.round(between(s.rng, 6, 12));
    } else {
      s.ball = {
        x: f.from.x + (receiver.x - f.from.x) * t,
        y: f.from.y + (receiver.y - f.from.y) * t,
      };
    }
  } else {
    s.ball = { ...receiver };
    if (s.tick >= s.releaseAt) pass(s);
  }
}

/**
 * Sandbox frame: [tick, ballX, ballY, p0x, p0y, …] in decimetres, 47 values, one per
 * step = 4 Hz. The real engine uses the contract's 48-value `Frame` (with ball height).
 */
type Frame = number[];

export function frame(s: SandboxState): Frame {
  const out = [s.tick, Math.round(s.ball.x * 10), Math.round(s.ball.y * 10)];
  for (const p of s.players) out.push(Math.round(p.pos.x * 10), Math.round(p.pos.y * 10));
  return out;
}

export const SANDBOX_MAX_TICK = (90 * 60) / DT;
/** Ten minutes of play per request keeps the response under 300 KB gzipped. */
export const SANDBOX_MAX_CHUNK = (10 * 60) / DT;
export {
  InstructionsSchema as SandboxInstructionsSchema,
  type Instructions as SandboxInstructions,
} from './shape';

/**
 * Frames for ticks from+1 … from+count of the sandbox match with this seed.
 * Each command changes team 0's instructions from its tick on.
 * ponytail: stateless, so every call re-simulates from tick 0 (about 100 ms for a
 * whole match). Real matches persist the state between chunks (ADR-015 §4).
 */
export function simulateSandbox(req: {
  seed: number;
  from: number;
  count: number;
  commands: { tick: number; instructions: Instructions }[];
}) {
  const commands = [...req.commands].sort((a, b) => a.tick - b.tick);
  const end = Math.min(req.from + req.count, SANDBOX_MAX_TICK);
  const s = createSandbox(req.seed);
  const frames: Frame[] = [];
  let next = 0;
  while (s.tick < end) {
    while (next < commands.length && commands[next]!.tick <= s.tick)
      s.instructions[0] = commands[next++]!.instructions;
    step(s);
    if (s.tick > req.from) frames.push(frame(s));
  }
  return { dt: DT, defaults: DEFAULT_INSTRUCTIONS, frames, done: end >= SANDBOX_MAX_TICK };
}

/** Runs `ticks` steps and returns their frames. Mutates `s`, so calls chain into one match. */
export function simulate(s: SandboxState, ticks: number): Frame[] {
  const frames: Frame[] = [];
  for (let i = 0; i < ticks; i++) {
    step(s);
    frames.push(frame(s));
  }
  return frames;
}
