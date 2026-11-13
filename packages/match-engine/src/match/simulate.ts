/**
 * Public entry of the level 1 engine: input and commands in, result out
 * (01-ARQUITETURA.md §2; 02 §11). The explanation is filled by MC-043.
 */
import type { MatchInput, MatchResult, TimedCommand } from '../contract';
import { explain } from '../rules/explain';
import { stepUntilEnd, type StepOptions } from './engine';
import { createMatch, type MatchState } from './state';

export function resultOf(s: MatchState): MatchResult {
  const ticks = s.teams[0].possessionTicks + s.teams[1].possessionTicks || 1;
  const stats = s.teams.map((t, i) => ({
    ...t.stats,
    xg: Math.round(t.stats.xg * 100) / 100,
    possession: Math.round((s.teams[i]!.possessionTicks / ticks) * 1000) / 1000,
  })) as MatchResult['stats'];
  const everyone = [...s.players, ...s.offPitch];
  return {
    engineVersion: s.version,
    score: [s.teams[0].score, s.teams[1].score],
    shootout: null,
    stats,
    players: everyone.map((p) => ({
      playerId: p.id,
      minutes: Math.min(130, Math.round((p.ticksOn * 0.25) / 60 / 0.62)),
      rating: Math.round(Math.min(10, Math.max(0, 6 + p.score)) * 10) / 10,
      stamina: Math.round(p.stamina * 100) / 100,
      distanceM: Math.round(p.distance),
    })),
    events: s.events,
    explanation: explain(s.events, Math.round(s.clockMs / 60000)),
  };
}

export function simulateMatch(
  input: MatchInput,
  commands: TimedCommand[] = [],
  opts: StepOptions = {},
): MatchResult {
  const s = createMatch(input, commands);
  stepUntilEnd(s, opts);
  return resultOf(s);
}
