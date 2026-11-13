/**
 * Bench decisions of either coach (02 §6.5 substituições, §10). Same rule for
 * both teams: the engine never knows which one belongs to the person. Tired
 * or injured players go off from the hour, in up to the windows the rules allow.
 * PARAMETERS: thresholds and timing.
 */
import type { PlayerInput } from '../contract';
import { lineOf } from '../team';
import { emit } from './events';
import type { MatchPlayer, MatchState } from './state';

const fit = (b: PlayerInput, out: MatchPlayer) => {
  let s = 0;
  for (const [pos, lvl] of Object.entries(out.input.positions))
    s += Math.min(lvl, b.positions[pos as keyof PlayerInput['positions']] ?? 0);
  return s;
};

export function substitutions(s: MatchState, interval: boolean): void {
  const minute = s.clockMs / 60000;
  const anyInjured = s.players.some((p) => p.active && p.injured);
  if (!interval && minute < 58 && !anyInjured) return;
  for (const team of [0, 1] as const) {
    const t = s.teams[team];
    if (t.subsLeft === 0 || t.bench.length === 0) continue;
    const injured = s.players.filter((p) => p.team === team && p.active && p.injured);
    if (t.windowsLeft === 0 && !interval && injured.length === 0) continue;
    const tired = (minute < 58 && !interval ? [] : s.players)
      .filter((p) => p.team === team && p.active && lineOf(p.role) !== 'gk' && !p.injured)
      .filter((p) => p.stamina < 0.42 - (0.04 * Math.max(0, 75 - minute)) / 15)
      .sort((a, b) => a.stamina - b.stamina || a.index - b.index);
    const going = [...injured, ...tired].slice(0, Math.min(3, t.subsLeft));
    if (going.length === 0) continue;
    for (const out of going) {
      const pickIdx = t.bench
        .map((b, i) => ({
          i,
          f: fit(b, out) + (b.positions.GK && lineOf(out.role) !== 'gk' ? -10 : 0),
        }))
        .sort((a, b) => b.f - a.f || a.i - b.i)[0]!.i;
      substitute(s, team, out.index, pickIdx);
    }
    if (!interval) t.windowsLeft = Math.max(0, t.windowsLeft - 1);
  }
}

/** Player `outIndex` leaves; bench player `benchIdx` takes his slot, role and spot (02 §6.5). */
export function substitute(s: MatchState, team: 0 | 1, outIndex: number, benchIdx: number): void {
  const t = s.teams[team];
  const out = s.players[outIndex]!;
  if (t.subsLeft === 0 || !out.active || !t.bench[benchIdx]) return;
  const inP = t.bench.splice(benchIdx, 1)[0]!;
  emit(s, 'substitution', team, out.index, null, out.pos, {
    minute: Math.round(s.clockMs / 60000),
  });
  const fresh: MatchPlayer = {
    ...out,
    id: inP.id,
    input: inP,
    attrs: inP.attributes,
    pace: inP.attributes.pace,
    acceleration: inP.attributes.acceleration,
    stamina: inP.condition,
    cards: 0,
    ticksOn: 0,
    distance: 0,
    score: 0,
    injured: false,
    acute: 0,
  };
  s.offPitch.push({ ...out, active: false });
  s.players[out.index] = fresh;
  s.events.at(-1)!.otherId = inP.id;
  t.subsLeft--;
  s.stoppage += 20000;
}

const BLOCKS = ['low', 'mid', 'high'] as const;
const up = (v: number, d: number) => Math.max(1, Math.min(5, v + d));

/**
 * The coach reads the score (02 §10; research 13 §5): from the hour a side
 * that is behind takes more risk, plays faster and presses higher; a side ahead
 * late on drops its block. Same rule for both teams; a coach with flexibility
 * below 30 (or the person's own team, which sends commands instead) keeps the plan.
 * Runs every 5 minutes of the clock. PARAMETERS: timing and steps.
 */
export function readTheGame(s: MatchState): void {
  const minute = s.clockMs / 60000;
  const slot = Math.floor(minute / 5);
  if (minute < 15 || slot === s.coachSlot) return;
  s.coachSlot = slot;
  for (const team of [0, 1] as const) {
    if (s.coaches[team].flexibility < 30) continue;
    beatThePress(s, team, minute);
    if (minute < 60) continue;
    // A coach who reads the game reacts sooner; a poor reader up to ten minutes later (ADR-019).
    if (minute < 70 + (99 - s.coaches[team].gameReading) / 10) continue;
    const diff = s.teams[team].score - s.teams[team === 0 ? 1 : 0].score;
    // Adjustments are set from the plan the coach started with, never stacked.
    const base = (s.basePlans ??= [
      structuredClone(s.plans[0].team),
      structuredClone(s.plans[1].team),
    ])[team];
    const t = { ...base, finalThird: { ...base.finalThird } };
    const before = JSON.stringify(s.plans[team].team);
    if (diff < 0 && minute >= 70) {
      // Behind: more risk and tempo from 70', more pressure from 80', the block up from 85' (one goal down).
      t.risk = up(t.risk, 1);
      t.tempo = up(t.tempo, 1);
      if (minute >= 80) t.pressIntensity = up(t.pressIntensity, 1);
      if (minute >= 85 && diff === -1) t.block = BLOCKS[Math.min(2, BLOCKS.indexOf(t.block) + 1)]!;
    } else if (diff > 0 && minute >= 85) {
      // Ahead late: one more player stays back.
      t.restDefence = Math.min(5, t.restDefence + 1);
    }
    s.plans[team].team = t;
    if (JSON.stringify(t) !== before)
      emit(s, 'command', team, null, null, null, { coach: 1, diff });
  }
}

/**
 * Being pressed (research 14 §4, Dortmund x Atlético): a coach who sees his side
 * lose the ball in its own third again and again widens the build-up and goes
 * longer. How soon he sees it depends on his game reading. PARAMETERS: window,
 * threshold.
 */
function beatThePress(s: MatchState, team: 0 | 1, minute: number): void {
  const t = s.plans[team].team;
  if (t.buildUp === 'long') return;
  const window = 10 + (99 - s.coaches[team].gameReading) / 10; // minutes he needs to notice
  const since = s.clockMs - window * 60000;
  let lost = 0;
  for (let i = s.events.length - 1; i >= 0; i--) {
    const e = s.events[i]!;
    if (e.atMs < since) break;
    if (e.kind !== 'phaseChange' || e.team === team || !e.at) continue;
    const x = team === 0 ? e.at[0] / 10 : 105 - e.at[0] / 10;
    if (x < 35) lost++;
  }
  if (lost < 3 || minute < window) return;
  t.buildUp = 'long';
  t.width = Math.min(5, t.width + 1);
  if (s.basePlans) s.basePlans[team] = { ...s.basePlans[team], buildUp: 'long', width: t.width };
  emit(s, 'command', team, null, null, null, { coach: 2, lost });
}
