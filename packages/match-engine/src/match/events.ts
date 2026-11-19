/** Event log of a match (02 §11). Positions are stored in decimetres, world frame. */
import type { EventKind, MatchEvent } from '../contract';
import type { Vec2 } from '../pitch';
import type { MatchState } from './state';

/** What emit needs: level 1 and level 2 states both fit. */
export type EventLog = Pick<MatchState, 'events' | 'clockMs'> & { players: { id: string }[] };

export function emit(
  s: EventLog,
  kind: EventKind,
  team: 0 | 1 | null,
  player: number | null,
  other: number | null,
  at: Vec2 | null,
  data: Record<string, number> = {},
): number {
  const id = s.events.length;
  const ev: MatchEvent = {
    id,
    kind,
    atMs: s.clockMs,
    team,
    playerId: player === null ? null : s.players[player]!.id,
    otherId: other === null ? null : s.players[other]!.id,
    at: at ? [Math.round(at.x * 10), Math.round(at.y * 10)] : null,
    data,
  };
  s.events.push(ev);
  return id;
}
