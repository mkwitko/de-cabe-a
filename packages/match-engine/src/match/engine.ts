/**
 * Level 1 match loop (02 §2): coordination, decision, execution, ball contact,
 * duels, referee and clock, one physics step of DT at a time. Pure and
 * deterministic: the same input and commands give the same match.
 */
import { advanceBall, firstContact, PLAYABLE_HEIGHT, type Ball, type Reacher } from '../ball';
import { arrivalTime } from '../kinematics';
import {
  aerialScore,
  contest,
  dribbleChance,
  norm,
  pressSync,
  tackleChance,
  weighted,
} from '../rules/duel';
import { gaussian } from '../rules/math';
import { DT, moveTowards, maxSpeed } from '../movement';
import { CENTER, LENGTH, WIDTH, clamp, dist, flip, type Vec2 } from '../pitch';
import { between, next } from '../random';
import { lineOf } from '../team';
import { coordinate, movePlayers } from '../world';
import { chanceFrom, chooseAction, settleTime, type Allowed } from './carrier';
import { kin, mates, opponents, pressureOn } from './control';
import { emit } from './events';
import { kick, shoot } from './kick';
import { PENALTY_XG } from '../rules/xg';
import { acuteLoad, drain, recover } from '../rules/stamina';
import { ACUTE_LOSS, fatigue } from '../kinematics';
import { foulChance, cardFor } from '../rules/discipline';
import { CONTACT_PER_FOUL, injuryRisk } from '../rules/injury';
import { readTheGame, substitute, substitutions } from './coach';
import type { MatchPlayer, MatchState, RestartKind } from './state';

export const BOX = 16.5;
const TACKLE_RATE = 0.12;
/** World-frame x direction a team attacks. */
const fwdOf = (team: 0 | 1) => (team === 0 ? 1 : -1);
const inOwnBox = (team: 0 | 1, p: Vec2) => {
  const t = flip(team, p);
  return t.x < BOX && t.y > CENTER.y - 20.16 && t.y < CENTER.y + 20.16;
};

/** PARAMETERS: seconds the clock runs while the ball is dead, by restart (02 §2: ball in play 52 to 58 min). */
const DEAD: Record<RestartKind | 'goal', [number, number]> = {
  kickOff: [10, 15],
  goal: [45, 70],
  throwIn: [10, 18],
  corner: [26, 40],
  goalKick: [22, 34],
  freeKick: [24, 40],
  penalty: [55, 85],
};

export interface StepOptions {
  /** Called with each 4 Hz frame (decimetres), only for matches someone watches. */
  onFrame?: (frame: number[]) => void;
}

// ── Restarts ────────────────────────────────────────────────────────────────

export function setRestart(
  s: MatchState,
  kind: RestartKind,
  team: 0 | 1,
  at: Vec2,
  why: 'goal' | null = null,
) {
  s.owner = null;
  s.flight = null;
  s.restart = { kind, team, at: { x: clamp(at.x, 0, LENGTH), y: clamp(at.y, 0, WIDTH) } };
  const [lo, hi] = DEAD[why ?? kind];
  const ms = Math.round(between(s.rngs.referee, lo, hi) * 1000);
  s.clockMs += ms;
  // Stoppage: goals, cards, injuries and substitutions are added back (02 §6.5 acréscimos). PARAMETER.
  if (why === 'goal') s.stoppage += 30000;
  // Players recover a little while the ball is dead.
  for (const p of s.players)
    if (p.active) {
      recover(p, ms / 1000);
      // Walking back into place while the ball is dead (PARAMETER: about 1 m/s).
      p.distance += (0.85 * ms) / 1000;
    }
  const stat = kind === 'corner' ? 'corners' : null;
  if (stat) s.teams[team].stats.corners++;
  if (
    kind === 'corner' ||
    kind === 'throwIn' ||
    kind === 'goalKick' ||
    kind === 'freeKick' ||
    kind === 'penalty'
  )
    emit(s, kind, team, null, null, s.restart.at);
}

function takeRestart(s: MatchState): Allowed {
  const r = s.restart!;
  s.restart = null;
  s.ball.possession = r.team;
  s.ball.pos = { ...r.at };
  s.ball.focal = { ...r.at };
  // Taker: keeper for goal kicks, the slot nearest the spot otherwise (centre-forward at kick-off).
  const team = mates(s, r.team);
  let taker: MatchPlayer;
  if (r.kind === 'goalKick') taker = team.find((p) => lineOf(p.role) === 'gk') ?? team[0]!;
  else if (r.kind === 'penalty' || r.kind === 'freeKick') {
    const best = (p: MatchPlayer) =>
      weighted(p.attrs, { setPieces: 0.5, finishing: 0.3, technique: 0.2 });
    const outfield = team.filter((p) => lineOf(p.role) !== 'gk');
    taker = [...outfield].sort((a, b) => best(b) - best(a) || a.index - b.index)[0]!;
    if (r.kind === 'freeKick' && flip(r.team, r.at).x < 75)
      taker = [...outfield].sort(
        (a, b) => dist(a.pos, r.at) - dist(b.pos, r.at) || a.index - b.index,
      )[0]!;
  } else
    taker = [...team]
      .filter((p) => lineOf(p.role) !== 'gk')
      .sort((a, b) => dist(a.pos, r.at) - dist(b.pos, r.at) || a.index - b.index)[0]!;
  // Clock jumped: players take their places for the restart (02 §2).
  s.ball.holder = taker.index;
  coordinate(s, 0, true);
  coordinate(s, 1, true);
  for (const p of s.players) {
    if (!p.active) continue;
    let pos = { ...p.target };
    if (r.kind === 'kickOff') {
      const t = flip(p.team, pos);
      pos = flip(p.team, { x: Math.min(t.x, CENTER.x - 1), y: t.y });
    }
    if (r.kind === 'penalty' && p.index !== taker.index && lineOf(p.role) !== 'gk') {
      const t = flip(r.team, pos);
      if (t.x > LENGTH - BOX) pos = flip(r.team, { x: LENGTH - BOX - 1, y: t.y });
    }
    // Opponents 9.15 m from a free kick or corner.
    if (
      (r.kind === 'freeKick' || r.kind === 'corner') &&
      p.team !== r.team &&
      dist(pos, r.at) < 9.15
    ) {
      const dx = pos.x - r.at.x;
      const dy = pos.y - r.at.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      pos = {
        x: clamp(r.at.x + (dx / d) * 9.2, 0.5, LENGTH - 0.5),
        y: clamp(r.at.y + (dy / d) * 9.2, 0.5, WIDTH - 0.5),
      };
    }
    p.pos = pos;
    p.vel = { x: 0, y: 0 };
  }
  taker.pos = { ...r.at };
  if (r.kind === 'kickOff') {
    // A team-mate stands next to the taker for the first pass.
    const mate = team
      .filter((p) => p.index !== taker.index && lineOf(p.role) !== 'gk')
      .sort((a, b) => dist(a.pos, r.at) - dist(b.pos, r.at) || a.index - b.index)[0];
    if (mate) mate.pos = flip(r.team, { x: CENTER.x - 6, y: CENTER.y + 4 });
  }
  if (r.kind === 'penalty') {
    const gk = opponents(s, r.team).find((p) => lineOf(p.role) === 'gk');
    if (gk) gk.pos = flip(r.team, { x: LENGTH - 0.5, y: CENTER.y });
  }
  gainBall(s, taker, true);
  taker.decideAt = s.tick + (r.kind === 'kickOff' ? 1 : 2);
  return r.kind === 'kickOff' ? 'kickOff' : r.kind === 'penalty' ? 'open' : r.kind;
}

// ── Possession ─────────────────────────────────────────────────────────────

function gainBall(s: MatchState, p: MatchPlayer, restart = false) {
  const changed = s.ball.possession !== p.team;
  s.owner = p.index;
  s.flight = null;
  s.lastTouch = p.index;
  s.ball.holder = p.index;
  s.ball.possession = p.team;
  s.ball.pos = { ...p.pos };
  s.ball.focal = { ...p.pos };
  s.ownedSince = s.tick;
  if (changed || restart) s.possessionSince = s.tick;
  p.decideAt = s.tick + Math.max(1, Math.round(settleTime(s, p) / DT));
  if (changed && !restart) emit(s, 'phaseChange', p.team, p.index, null, p.pos, { won: 1 });
}

function looseBall(s: MatchState, from: number, at: Vec2, vx: number, vy: number, vz = 0) {
  s.owner = null;
  s.flight = {
    ball: { x: at.x, y: at.y, z: vz > 0 ? 0.3 : 0, vx, vy, vz },
    from,
    to: null,
    kind: 'loose',
    skip: [from],
    offside: [],
    beaten: false,
    shot: null,
  };
}

// ── Carrier ───────────────────────────────────────────────────────────────

function carrierStep(s: MatchState, restartAllowed: Allowed | null) {
  const c = s.players[s.owner!]!;
  const allowed: Allowed =
    restartAllowed ??
    (lineOf(c.role) === 'gk' &&
    inOwnBox(c.team, c.pos) &&
    s.tick - s.ownedSince < 40 &&
    s.events.at(-1)?.kind === 'save'
      ? 'keeper'
      : 'open');
  if (s.tick < c.decideAt && restartAllowed === null) return;
  // Penalty: the shot is the only option.
  if (restartAllowed === 'open' && s.events.at(-1)?.kind === 'penalty') {
    s.flight = shoot(
      s,
      c,
      {
        kind: 'shot',
        target: flip(c.team, { x: LENGTH, y: CENTER.y }),
        receiver: null,
        p: PENALTY_XG,
        est: PENALTY_XG,
        u: 0,
        ue: 0,
      },
      [],
      { penalty: true, chance: PENALTY_XG },
    );
    s.owner = null;
    return;
  }
  const choice = chooseAction(s, c, allowed === 'keeper' ? 'goalKick' : allowed);
  const a = choice.action;
  c.decideAt = s.tick + 2; // re-decide every 0.5 s while carrying (02 §2)
  if (a.kind === 'carry' || a.kind === 'hold' || a.kind === 'dribble') {
    if (restartAllowed !== null) {
      // A restart must be played: fall back to the safest pass.
      return;
    }
    c.target = a.kind === 'hold' ? { ...c.pos } : { ...a.target };
    if (a.kind === 'dribble') dribble(s, c);
    return;
  }
  const noOffside =
    restartAllowed === 'throwIn' || restartAllowed === 'goalKick' || restartAllowed === 'corner';
  s.flight = kick(s, c, a, noOffside);
  if (s.flight.blocked !== undefined && s.flight.blocked >= 0) {
    s.lastTouch = s.flight.blocked;
    setRestart(s, 'corner', c.team, {
      x: c.team === 0 ? LENGTH : 0,
      y: c.pos.y < CENTER.y ? 0.5 : WIDTH - 0.5,
    });
    return;
  }
  s.owner = null;
  s.ball.holder = a.receiver?.index ?? null;
  s.ball.focal = { ...a.target };
  // Decision error flag for the log: he chose clearly worse than the best option he saw.
  if (choice.best - a.u > 0.02) s.events.at(-1)!.data.choseBadly = 1;
}

/** 1v1: the carrier tries to go past the nearest opponent in front (02 §6). */
function dribble(s: MatchState, c: MatchPlayer) {
  const d = opponents(s, c.team)
    .filter((o) => dist(o.pos, c.pos) < 3.5)
    .sort((a, b) => dist(a.pos, c.pos) - dist(b.pos, c.pos) || a.index - b.index)[0];
  if (!d) return;
  const p = dribbleChance(c.attrs, d.attrs);
  const won = next(s.rngs.execution) < p;
  emit(s, 'dribble', c.team, c.index, d.index, c.pos, { won: won ? 1 : 0 });
  if (won) {
    d.tackleAt = s.tick + 8; // beaten: out of the play for two seconds
    c.score += 0.15;
  } else tackleWins(s, d, c, false);
}

// ── Tackles and fouls ───────────────────────────────────────────────────────

function tackleWins(s: MatchState, d: MatchPlayer, c: MatchPlayer, emitTackle = true) {
  if (emitTackle) emit(s, 'tackle', d.team, d.index, c.index, c.pos, { won: 1 });
  d.score += 0.12;
  // Near a line, a tackle often knocks the ball out of play (PARAMETER: throw-ins and corners per match, 02 §11).
  const toTouch = Math.min(c.pos.y, WIDTH - c.pos.y);
  if (toTouch < 8 && next(s.rngs.execution) < 0.45) {
    s.lastTouch = d.index;
    setRestart(s, 'throwIn', c.team, { x: c.pos.x, y: c.pos.y < CENTER.y ? 0 : WIDTH });
    return;
  }
  const cg = flip(c.team, c.pos);
  if (cg.x > LENGTH - 12 && next(s.rngs.execution) < 0.5) {
    s.lastTouch = d.index;
    setRestart(s, 'corner', c.team, {
      x: c.team === 0 ? LENGTH : 0,
      y: c.pos.y < CENTER.y ? 0.5 : WIDTH - 0.5,
    });
    return;
  }
  if (next(s.rngs.execution) < 0.55 + 0.3 * norm(d.attrs.technique)) gainBall(s, d);
  else {
    const ang = gaussian(() => next(s.rngs.execution));
    looseBall(s, d.index, c.pos, ang * 3, gaussian(() => next(s.rngs.execution)) * 3);
  }
}

function tackles(s: MatchState) {
  if (s.owner === null) return;
  const c = s.players[s.owner]!;
  if (lineOf(c.role) === 'gk' && inOwnBox(c.team, c.pos)) return; // ball in the keeper's hands
  // The keeper comes out at a carrier close to him in his box (02 §6.4 um contra um). PARAMETERS.
  const k = opponents(s, c.team).find((o) => lineOf(o.role) === 'gk' && inOwnBox(o.team, o.pos));
  if (k && inOwnBox(k.team, c.pos) && dist(k.pos, c.pos) < 3 && next(s.rngs.execution) < 0.6) {
    const won =
      next(s.rngs.execution) <
      contest(norm(k.attrs.oneOnOne) - norm(c.attrs.dribbling), -0.1, 0.12);
    emit(s, 'save', k.team, k.index, c.index, c.pos, { smother: 1, won: won ? 1 : 0 });
    if (won) {
      gainBall(s, k);
      k.decideAt = s.tick + 12;
      return;
    }
  }
  for (const d of opponents(s, c.team)) {
    if (s.owner === null) return;
    if (d.tackleAt > s.tick || dist(d.pos, c.pos) > 1.4 || lineOf(d.role) === 'gk') continue;
    if (d.intent !== 'press' && dist(d.pos, c.pos) > 1.0) continue;
    // Chance per step that a close defender commits to a tackle. PARAMETER (tackles per match, 02 §11).
    // A booked player goes into tackles more carefully (PARAMETER).
    // A drilled pressing side commits together; a loose one arrives late (research 13 §1).
    // Coaching that teaches and communicates well makes the press move as one (ADR-019).
    const coach = s.coaches[d.team];
    const taught = 0.85 + 0.3 * ((coach.teaching + coach.communication) / 198);
    // Just lost it: players quick to react hunt the ball straight away (counter-press).
    const justLost = s.ball.possession !== d.team && s.tick - s.possessionSince < 12;
    const reaction = justLost
      ? 0.8 + 0.6 * norm(d.attrs.lossReaction)
      : 0.7 + 0.6 * norm(d.attrs.pressing);
    // Centred near 1 for an average side (press sync about 0.65).
    const sync = (0.35 + pressSync(d.attrs, s.familiarity[d.team]) * taught) * reaction;
    // In his own box a defender stays on his feet: a foul there is a penalty (PARAMETERS).
    const box = inOwnBox(d.team, c.pos);
    if (next(s.rngs.execution) > TACKLE_RATE * sync * (d.cards === 1 ? 0.4 : 1) * (box ? 0.35 : 1))
      continue;
    d.tackleAt = s.tick + 4;
    // Behind: the defender is on the far side of the carrier from the carrier's own goal direction.
    const cg = flip(c.team, c.pos);
    const dg = flip(c.team, d.pos);
    const behind = dg.x < cg.x - 0.3;
    const won = next(s.rngs.execution) < tackleChance(d.attrs, c.attrs, behind);
    const pf = foulChance(d, behind, won) * (d.cards === 1 ? 0.6 : 1) * (box ? 0.4 : 1);
    if (next(s.rngs.referee) < pf) {
      foul(s, d, c, behind);
      return;
    }
    if (won) tackleWins(s, d, c);
    else {
      emit(s, 'tackle', d.team, d.index, c.index, c.pos, { won: 0 });
      d.tackleAt = s.tick + 6;
    }
  }
}

export function foul(s: MatchState, d: MatchPlayer, c: MatchPlayer, behind: boolean) {
  s.teams[d.team].stats.fouls++;
  emit(s, 'foul', d.team, d.index, c.index, c.pos, { behind: behind ? 1 : 0 });
  const cg = flip(c.team, c.pos);
  // Promising attack and last man (02 §6.5 cartão).
  const goalSide = opponents(s, c.team).filter(
    (o) => flip(c.team, o.pos).x > cg.x && o.index !== d.index,
  ).length;
  const card = cardFor(
    s.input.conditions.refereeStrictness,
    d,
    {
      behind,
      promising: cg.x > 70,
      lastMan: goalSide === 0 && cg.x > 75 && Math.abs(cg.y - CENTER.y) < 20,
    },
    next(s.rngs.referee),
    next(s.rngs.referee),
  );
  if (card > 0) {
    const prev = d.cards;
    const red = card === 2 || prev === 1;
    d.cards = red ? 2 : 1;
    emit(s, 'card', d.team, d.index, null, d.pos, {
      card: red ? 2 : 1,
      second: prev === 1 ? 1 : 0,
    });
    s.stoppage += 15000;
    if (red) {
      s.teams[d.team].stats.redCards++;
      if (prev === 1) s.teams[d.team].stats.yellowCards++;
      d.active = false;
    } else s.teams[d.team].stats.yellowCards++;
  }
  d.score -= card === 2 ? 1.5 : card === 1 ? 0.3 : 0.05;
  if (next(s.rngs.injury) < CONTACT_PER_FOUL) injure(s, c, true);
  if (inOwnBox(d.team, c.pos))
    setRestart(s, 'penalty', c.team, flip(c.team, { x: LENGTH - 11, y: CENTER.y }));
  else setRestart(s, 'freeKick', c.team, c.pos);
}

/** An injured player keeps limping (slow and spent) until the bench replaces him (MC-041). */
function injure(s: MatchState, p: MatchPlayer, contact: boolean) {
  p.injured = true;
  p.stamina = Math.min(p.stamina, 0.15);
  p.pace = Math.round(p.pace * 0.6);
  p.acceleration = Math.round(p.acceleration * 0.6);
  emit(s, 'injury', p.team, p.index, null, p.pos, { contact: contact ? 1 : 0 });
  s.stoppage += 60000;
}

// ── Ball in flight ──────────────────────────────────────────────────────────

function reachers(s: MatchState): Reacher[] {
  const f = s.flight!;
  return s.players.map((p) => {
    if (!p.active) return { pos: { x: -999, y: -999 }, vel: { x: 0, y: 0 }, reach: 0, height: 0 };
    const gk = lineOf(p.role) === 'gk' && inOwnBox(p.team, p.pos);
    // The intended receiver reaches for the ball he expects (PARAMETER).
    let reach = f.to === p.index ? 1.3 : 1.0;
    if (gk)
      reach =
        f.kind === 'shot'
          ? f.beaten
            ? 0
            : 4
          : f.kind === 'cross'
            ? 1.8 + 1.2 * norm(p.attrs.commandOfArea)
            : 2.2;
    else if (f.kind === 'shot')
      reach = 0.35 + 0.2 * norm(p.attrs.bravery); // a block needs the body in the line
    else if (f.kind === 'pass' && p.team !== s.players[f.from]!.team)
      reach = 0.6 + 0.35 * norm(p.attrs.anticipation);
    return { pos: p.pos, vel: p.vel, reach, height: gk ? 2.9 : PLAYABLE_HEIGHT };
  });
}

function flightStep(s: MatchState) {
  const f = s.flight!;
  // A shot that has lost its pace (deflected, or short) is a loose ball anyone can play.
  if (f.kind === 'shot' && f.ball.vx * f.ball.vx + f.ball.vy * f.ball.vy < 36) {
    f.kind = 'loose';
    f.beaten = false;
  }
  const skip = new Set(f.skip);
  const hit = firstContact(f.ball, reachers(s), DT, skip);
  f.skip = [];
  if (!hit) {
    advanceBall(f.ball, DT);
    s.ball.pos = { x: f.ball.x, y: f.ball.y };
    return;
  }
  advanceBall(f.ball, hit.t);
  s.ball.pos = { x: f.ball.x, y: f.ball.y };
  if (hit.kind === 'line') return outOfPlay(s, hit.side);
  touch(s, s.players[hit.index]!);
}

function outOfPlay(s: MatchState, side: 'goal0' | 'goal1' | 'byline0' | 'byline1' | 'touchline') {
  const f = s.flight!;
  const last = s.players[s.lastTouch]!;
  const at = { x: f.ball.x, y: f.ball.y };
  if (side === 'goal0' || side === 'goal1') {
    const scorer = s.players[f.from]!;
    const team = side === 'goal1' ? 0 : 1; // goal1 is the goal at x = 105, attacked by team 0
    s.teams[team].score++;
    s.teams[team].stats.goals++;
    const own = scorer.team !== team;
    const found = own ? null : lastPasser(s, scorer);
    // The passer may have been substituted off since: no assist then.
    const assist = found !== null && found >= 0 && found !== scorer.index ? found : null;
    emit(s, 'goal', team, scorer.index, assist, at, { own: own ? 1 : 0, xg: f.shot?.xg ?? 0 });
    if (!own) scorer.score += 1.2;
    if (assist !== null) s.players[assist]!.score += 0.6;
    for (const p of s.players)
      if (p.team !== team && p.active && (lineOf(p.role) === 'gk' || lineOf(p.role) === 'def'))
        p.score -= 0.25;
    s.flight = null;
    setRestart(s, 'kickOff', team === 0 ? 1 : 0, { ...CENTER }, 'goal');
    return;
  }
  if (f.shot && side !== 'touchline') emit(s, 'save', null, null, null, at, { wide: 1 });
  if (side === 'touchline') {
    setRestart(s, 'throwIn', last.team === 0 ? 1 : 0, { x: at.x, y: at.y < CENTER.y ? 0 : WIDTH });
    return;
  }
  // Byline: corner if the defending side touched it last, goal kick otherwise.
  const defending: 0 | 1 = side === 'byline1' ? 1 : 0;
  if (last.team === defending) {
    const x = side === 'byline1' ? LENGTH : 0;
    setRestart(s, 'corner', defending === 0 ? 1 : 0, { x, y: at.y < CENTER.y ? 0.5 : WIDTH - 0.5 });
  } else
    setRestart(s, 'goalKick', defending, {
      x: side === 'byline1' ? LENGTH - 5.5 : 5.5,
      y: CENTER.y,
    });
}

function lastPasser(s: MatchState, scorer: MatchPlayer): number | null {
  for (let i = s.events.length - 1; i >= 0 && i > s.events.length - 12; i--) {
    const e = s.events[i]!;
    if (e.kind === 'pass' && e.team === scorer.team && e.otherId === scorer.id)
      return s.players.findIndex((p) => p.id === e.playerId);
    if (e.kind === 'pass' && e.team === scorer.team && e.data.cross === 1)
      return s.players.findIndex((p) => p.id === e.playerId);
    if (e.kind === 'phaseChange') break;
  }
  return null;
}

/** A player reaches the ball: reception, interception, header, block or save. */
function touch(s: MatchState, p: MatchPlayer) {
  const f = s.flight!;
  const kicker = s.players[f.from]!;
  const same = p.team === kicker.team;
  const b = f.ball;
  const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  s.lastTouch = p.index;
  // Offside: a team-mate in an offside position when it was played becomes involved (02 §6.5).
  if (same && f.offside.includes(p.index)) {
    s.teams[p.team].stats.offsides++;
    emit(s, 'offside', p.team, p.index, kicker.index, p.pos);
    setRestart(s, 'freeKick', p.team === 0 ? 1 : 0, p.pos);
    return;
  }
  const gk = lineOf(p.role) === 'gk' && inOwnBox(p.team, p.pos);
  // An attacker receiving next to the keeper in the six-yard area is smothered (02 §6.4 um contra um). PARAMETER.
  if (!gk && f.kind !== 'shot') {
    const k = opponents(s, p.team).find((o) => lineOf(o.role) === 'gk' && inOwnBox(o.team, o.pos));
    if (
      k &&
      dist(k.pos, p.pos) < 2.5 &&
      next(s.rngs.execution) < 0.4 + 0.4 * norm(k.attrs.oneOnOne)
    ) {
      emit(s, 'save', k.team, k.index, p.index, k.pos, { smother: 1 });
      gainBall(s, k);
      k.decideAt = s.tick + 12;
      return;
    }
  }
  if (f.kind === 'shot') {
    if (gk) return save(s, p, f);
    // Block: the ball keeps part of its pace and changes direction (often behind for a corner).
    emit(s, 'save', p.team, p.index, kicker.index, p.pos, { block: 1 });
    p.score += 0.1;
    // A blocked shot goes behind for a corner a good share of the time (PARAMETER, corners per match 02 §11).
    if (next(s.rngs.execution) < 0.65) {
      setRestart(s, 'corner', kicker.team, {
        x: p.team === 0 ? 0 : LENGTH,
        y: p.pos.y < CENTER.y ? 0.5 : WIDTH - 0.5,
      });
      return;
    }
    const keep = 0.3 + 0.4 * next(s.rngs.execution);
    const side = gaussian(() => next(s.rngs.execution));
    looseBall(s, p.index, p.pos, b.vx * keep - b.vy * side * 0.6, b.vy * keep + b.vx * side * 0.6);
    return;
  }
  // High ball: aerial contest among those under it (MC-163).
  if (b.z > 1.0 && !gk) return aerial(s, p);
  if (gk && b.z > 0.5) {
    // Keeper claims a cross.
    const ok =
      next(s.rngs.execution) <
      0.55 + 0.35 * weighted(p.attrs, { commandOfArea: 0.6, handling: 0.4 });
    if (ok) {
      emit(s, 'save', p.team, p.index, null, p.pos, { claim: 1 });
      gainBall(s, p);
      p.decideAt = s.tick + 12;
      return;
    }
    looseBall(s, p.index, p.pos, fwdOf(p.team) * 6, gaussian(() => next(s.rngs.execution)) * 5);
    return;
  }
  // Ground ball: control quality (02 §6 recepção). PARAMETERS.
  const touchSkill = weighted(p.attrs, { firstTouch: 0.6, technique: 0.4 });
  const hard = clamp((speed - 8) / 20, 0, 1);
  const pressure = pressureOn(s, p);
  // An open body shape takes the ball cleanly under pressure (ADR-019).
  const clean = contest(
    touchSkill - 0.4 + 0.1 * (norm(p.attrs.bodyOrientation) - 0.5),
    0.25 * hard + 0.15 * pressure - (same ? 0.25 : 0),
    0.1,
  );
  if (next(s.rngs.execution) < clean || gk) {
    if (f.kind === 'pass' && f.to !== null) {
      if (same) {
        s.teams[p.team].stats.passesCompleted++;
        kicker.score += 0.01;
        emit(s, 'reception', p.team, p.index, kicker.index, p.pos);
      } else {
        emit(s, 'interception', p.team, p.index, kicker.index, p.pos);
        p.score += 0.1;
      }
    }
    gainBall(s, p);
    if (gk) p.decideAt = s.tick + 10;
    return;
  }
  // Heavy touch: the ball runs loose a few metres.
  const k = 0.25 + 0.3 * next(s.rngs.execution);
  looseBall(
    s,
    p.index,
    p.pos,
    b.vx * k + gaussian(() => next(s.rngs.execution)) * 1.5,
    b.vy * k + gaussian(() => next(s.rngs.execution)) * 1.5,
  );
}

function save(s: MatchState, k: MatchPlayer, f: NonNullable<MatchState['flight']>) {
  const shooter = s.players[f.from]!;
  emit(s, 'save', k.team, k.index, shooter.index, k.pos, { xg: f.shot?.xg ?? 0 });
  k.score += 0.35;
  const hold =
    next(s.rngs.execution) < 0.35 + 0.45 * weighted(k.attrs, { handling: 0.7, reflexes: 0.3 });
  if (hold) {
    gainBall(s, k);
    k.decideAt = s.tick + 16;
    return;
  }
  // Parry: wide for a corner a third of the time, otherwise a rebound in front (02 §6.4). PARAMETERS.
  const wide = next(s.rngs.execution) < 0.55;
  const side = k.pos.y < CENTER.y ? -1 : 1;
  const fwd = fwdOf(k.team);
  if (wide) {
    s.lastTouch = k.index;
    setRestart(s, 'corner', shooter.team, {
      x: k.team === 0 ? 0 : LENGTH,
      y: side < 0 ? 0.5 : WIDTH - 0.5,
    });
    return;
  }
  looseBall(
    s,
    k.index,
    k.pos,
    fwd * (5 + 5 * next(s.rngs.execution)),
    side * (3 + 6 * next(s.rngs.execution)),
  );
}

function aerial(s: MatchState, first: MatchPlayer) {
  const f = s.flight!;
  const at = { x: f.ball.x, y: f.ball.y };
  const near = s.players.filter(
    (p) => p.active && dist(p.pos, at) < 1.8 && lineOf(p.role) !== 'gk',
  );
  // Uncontested and not too high: chest or thigh control (02 §6 recepção). PARAMETER.
  if (!near.some((p) => p.team !== first.team)) {
    const kicker = s.players[f.from]!;
    if (
      next(s.rngs.execution) <
      0.55 + 0.4 * weighted(first.attrs, { firstTouch: 0.6, technique: 0.4 })
    ) {
      if (f.kind === 'pass' && f.to !== null && kicker.team === first.team) {
        s.teams[first.team].stats.passesCompleted++;
        emit(s, 'reception', first.team, first.index, kicker.index, first.pos);
      }
      gainBall(s, first);
      return;
    }
  }
  const score = (p: MatchPlayer) =>
    aerialScore(p.attrs, p.input.heightCm) + 0.08 * gaussian(() => next(s.rngs.execution));
  let win = first;
  let best = -Infinity;
  for (const p of near) {
    const v = score(p);
    if (v > best || (v === best && p.index < win.index)) {
      best = v;
      win = p;
    }
  }
  s.lastTouch = win.index;
  const kicker = s.players[f.from]!;
  const t = flip(win.team, win.pos);
  // Attacking header near goal: a shot (02 §6.3).
  if (win.team === kicker.team && t.x > LENGTH - 14 && Math.abs(t.y - CENTER.y) < 10) {
    const chance = chanceFrom(s, win, true, f.kind === 'cross');
    s.flight = shoot(
      s,
      win,
      {
        kind: 'shot',
        target: flip(win.team, { x: LENGTH, y: CENTER.y }),
        receiver: null,
        p: chance,
        est: chance,
        u: 0,
        ue: 0,
      },
      [],
      { header: true, chance },
    );
    return;
  }
  // A defender under pressure in his own box sometimes heads it behind (02 §6.3). PARAMETER.
  if (win.team !== kicker.team && inOwnBox(win.team, win.pos) && next(s.rngs.execution) < 0.4) {
    setRestart(s, 'corner', kicker.team, {
      x: win.team === 0 ? 0 : LENGTH,
      y: win.pos.y < CENTER.y ? 0.5 : WIDTH - 0.5,
    });
    return;
  }
  // Otherwise the winner heads it on or away.
  const fwd = fwdOf(win.team);
  const pw = win.team === kicker.team ? 6 : 12;
  looseBall(
    s,
    win.index,
    win.pos,
    fwd * (pw + 4 * next(s.rngs.execution)),
    gaussian(() => next(s.rngs.execution)) * 5,
    win.team === kicker.team ? 0 : 4,
  );
}

// ── The step ────────────────────────────────────────────────────────────────

/** Live commands due by now (02 §9): the server stamps them with the match clock. */
function applyCommands(s: MatchState) {
  while (s.commands.length > 0 && s.commands[0]!.atMs <= s.clockMs) {
    const { team, command: c } = s.commands.shift()!;
    if (c.kind === 'team')
      s.plans[team].team = { ...s.plans[team].team, ...c.set } as (typeof s.plans)[0]['team'];
    else if (c.kind === 'sub') {
      const i = s.teams[team].bench.findIndex((b) => b.id === c.inPlayerId);
      if (i >= 0) substitute(s, team, team * 11 + c.out, i);
    }
    emit(s, 'command', team, null, null, null, {
      kind: ['team', 'player', 'mark', 'swap', 'sub', 'shout'].indexOf(c.kind),
    });
  }
}

export function step(s: MatchState, opts: StepOptions = {}): void {
  if (s.finished) return;
  applyCommands(s);
  let restartAllowed: Allowed | null = null;
  if (s.restart) restartAllowed = takeRestart(s);
  const before = s.ball.possession;
  if (s.owner !== null) carrierStep(s, restartAllowed);
  else if (s.flight) flightStep(s);
  const event = s.ball.possession !== before || restartAllowed !== null;
  if (s.restart) return endStep(s, opts);

  // Team layer and targets.
  if (s.owner !== null) {
    s.ball.holder = s.owner;
    s.ball.pos = { ...s.players[s.owner]!.pos };
    s.ball.focal = { ...s.ball.pos };
  } else if (s.flight) s.ball.pos = { x: s.flight.ball.x, y: s.flight.ball.y };
  const carrierTarget = s.owner !== null ? { ...s.players[s.owner]!.target } : null;
  coordinate(s, 0, event);
  coordinate(s, 1, event);
  if (s.owner !== null && carrierTarget) s.players[s.owner]!.target = carrierTarget;
  chaseLooseBall(s);
  // movePlayers leaves the holder to the caller; in flight nobody holds the ball.
  const intended = s.ball.holder;
  if (s.owner === null) s.ball.holder = null;
  movePlayers(s);
  s.ball.holder = intended;
  if (s.owner !== null) {
    const c = s.players[s.owner]!;
    moveTowards(c, c.target, maxSpeed(c) * (0.8 + 0.1 * norm(c.attrs.dribbling)));
    s.ball.pos = { ...c.pos };
    tackles(s);
  }
  endStep(s, opts);
}

/**
 * Where `p` meets the ball: the first point on its path he reaches before it
 * (arrival model, 02 §4.1), else where it stops. Sampled every 0.25 s for 4 s.
 */
function meetPoint(p: MatchPlayer, ball: Ball, reacting: boolean): { pt: Vec2; t: number } {
  const b = { ...ball };
  const k = kin(p);
  for (let t = 0.25; t <= 4; t += 0.25) {
    advanceBall(b, 0.25);
    const pt = { x: clamp(b.x, 0, LENGTH), y: clamp(b.y, 0, WIDTH) };
    if (b.z < PLAYABLE_HEIGHT && arrivalTime(k, pt, reacting) <= t) return { pt, t };
  }
  return {
    pt: { x: clamp(b.x, 0, LENGTH), y: clamp(b.y, 0, WIDTH) },
    t: 4 + arrivalTime(k, b, reacting),
  };
}

/** Without an owner, the intended receiver and the quickest player of each side go to meet the ball (02 §6: whoever arrives first gets it). */
function chaseLooseBall(s: MatchState) {
  const f = s.flight;
  if (!f || f.kind === 'shot') return;
  for (const team of [0, 1] as const) {
    if (f.kind === 'pass' && f.to !== null) {
      const r = s.players[f.to]!;
      if (r.team === team && r.active) {
        r.target = meetPoint(r, f.ball, true).pt;
        r.intent = 'receive';
        continue;
      }
    }
    // The keeper comes for a ball in his own box; outfield players for the rest.
    let best: MatchPlayer | null = null;
    let bt = Infinity;
    let bp: Vec2 | null = null;
    for (const p of mates(s, team)) {
      const m = meetPoint(p, f.ball, false);
      // The keeper comes for balls in his box, and beyond it as far as his sweeping allows (ADR-019).
      const g = flip(team, m.pt);
      const sweeper = g.x < 16.5 + 15 * norm(p.attrs.sweeping) && Math.abs(g.y - CENTER.y) < 25;
      if (lineOf(p.role) === 'gk' ? !(inOwnBox(team, m.pt) || sweeper) : inOwnBox(team, m.pt))
        continue;
      if (m.t < bt) {
        bt = m.t;
        best = p;
        bp = m.pt;
      }
    }
    if (best && bp) {
      best.target = bp;
      best.intent = 'receive';
    }
  }
}

function endStep(s: MatchState, opts: StepOptions) {
  for (const p of s.players) {
    if (!p.active) continue;
    p.ticksOn++;
    const v = Math.sqrt(p.vel.x * p.vel.x + p.vel.y * p.vel.y);
    p.distance += v * DT;
    // Pressing costs (02 §8.3: pressão 5 gasta fôlego): the whole block works harder without the ball.
    const t = s.plans[p.team].team;
    const load =
      s.ball.possession === p.team
        ? 1
        : 1 +
          0.18 * (t.pressIntensity - 3) +
          (t.block === 'high' ? 0.12 : t.block === 'low' ? -0.08 : 0);
    // Determination keeps a player going when it hurts (ADR-019).
    drain(p, v, DT * load * (1.1 - 0.2 * norm(p.attrs.determination)));
    p.acute = acuteLoad(p.acute, v, p.attrs.pace, p.attrs.recovery, DT);
    p.sharp = fatigue(p.stamina) * (1 - ACUTE_LOSS * p.acute);
    if (!p.injured && next(s.rngs.injury) < injuryRisk(p, DT)) injure(s, p, false);
  }
  if (s.ball.possession !== null && !s.restart) s.teams[s.ball.possession].possessionTicks++;
  if (opts.onFrame) opts.onFrame(frameOf(s));
  s.tick++;
  s.periodTick++;
  // The benches every 10 s; the coaches read the score every 5 minutes (02 §10).
  if (s.tick % 40 === 0) {
    substitutions(s, false);
    readTheGame(s);
  }
  s.clockMs += DT * 1000;
  clock(s);
}

export function frameOf(s: MatchState): number[] {
  const b = s.flight ? s.flight.ball : { x: s.ball.pos.x, y: s.ball.pos.y, z: 0 };
  const f = [s.tick, Math.round(b.x * 10), Math.round(b.y * 10), Math.round(b.z * 10)];
  for (const p of s.players) f.push(Math.round(p.pos.x * 10), Math.round(p.pos.y * 10));
  return f;
}

/** Period ends at 45 minutes plus stoppage (extra time 15); halves restart with a kick-off (02 §6.5). */
function clock(s: MatchState) {
  const regular = s.period <= 2 ? 45 * 60000 : 15 * 60000;
  const start =
    s.period === 1 ? 0 : s.period === 2 ? 45 * 60000 : s.period === 3 ? 90 * 60000 : 105 * 60000;
  // Clock of the period counts from its start; earlier stoppage was already played.
  const into = s.clockMs - (s.periodStartMs || start);
  if (into < regular + s.stoppage) {
    if (s.period <= 2 && into > 60 * 60000) s.stoppage = 0; // safety
    return;
  }
  // Do not stop in the middle of a shot.
  if (s.flight?.kind === 'shot') return;
  emit(s, 'periodEnd', null, null, null, null, {
    period: s.period,
    stoppage: Math.round(s.stoppage / 60000),
  });
  const tied = s.teams[0].score === s.teams[1].score;
  const extra = s.input.rules.extraTime && tied;
  if (s.period === 1 || s.period === 3 || (s.period === 2 && extra)) {
    s.period++;
    s.periodTick = 0;
    s.stoppage = 0;
    s.periodStartMs = s.clockMs;
    for (const p of s.players) if (p.active) recover(p, s.period === 2 ? 900 : 300);
    emit(s, 'periodStart', null, null, null, null, { period: s.period });
    setRestart(s, 'kickOff', s.period % 2 === 0 ? 1 : 0, { ...CENTER });
    substitutions(s, true);
    return;
  }
  s.finished = true;
}

export function stepUntilEnd(s: MatchState, opts: StepOptions = {}) {
  while (!s.finished) step(s, opts);
}
