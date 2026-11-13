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
  };
  s.offPitch.push({ ...out, active: false });
  s.players[out.index] = fresh;
  s.events.at(-1)!.otherId = inP.id;
  t.subsLeft--;
  s.stoppage += 20000;
}
