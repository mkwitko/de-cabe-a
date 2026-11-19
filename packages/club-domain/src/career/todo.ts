/**
 * The inbox read as a to-do (UI view logic, nothing here moves the simulation): what still asks
 * the person for an answer, and the news that is left. Pending items come from the live state
 * (bids, vacancies, contracts), never from the notes alone, so an answered one drops out.
 */
import { endingSoon } from '../market/contracts';
import type { CareerWorld } from './advance';
import { approaches } from './coaches';
import type { Note } from './inbox';

export type Todo =
  | { kind: 'bid'; id: string; player: string; from: string; fee: number }
  | { kind: 'approach'; club: string }
  | { kind: 'agentOffer'; player: string; agent: string; club: string; day: number }
  | { kind: 'contractsEnding'; players: number };

/** Notes that are (or were) a request: they live in the to-do while open and vanish after. */
const ASKING = new Set(['bid', 'approach', 'agentOffer', 'homecoming', 'contractsEnding']);
/** How long an agent's offer or a contract reminder counts as waiting for an answer. */
const OPEN_DAYS = 30;

/** What waits for the person's answer on `w.day`. */
export function todoOf(w: CareerWorld): Todo[] {
  const out: Todo[] = [];
  for (const b of (w.bids ?? []).filter((x) => !x.again))
    out.push({ kind: 'bid', id: b.id, player: b.player, from: b.from, fee: b.fee });
  for (const club of approaches(w)) out.push({ kind: 'approach', club });
  const mine = new Set(
    w.pack.players.filter((p) => p.clubId === w.clubId).map((p) => p.knownAs ?? p.name),
  );
  let reminded = false;
  for (const n of w.inbox ?? []) {
    if (w.day - n.day > OPEN_DAYS) continue;
    // ponytail: matched by display name (the note keeps no id); upgrade by storing the id.
    if (n.kind === 'agentOffer' && !mine.has(n.player))
      out.push({ kind: 'agentOffer', player: n.player, agent: n.agent, club: n.club, day: n.day });
    // A homecoming opens a talk: it waits while that talk does.
    if (
      n.kind === 'homecoming' &&
      Object.keys(w.talks ?? {}).some((id) => {
        const p = w.pack.players.find((x) => x.id === id);
        return (p?.knownAs ?? p?.name) === n.player;
      })
    )
      out.push({ kind: 'agentOffer', player: n.player, agent: n.agent, club: '', day: n.day });
    if (n.kind === 'contractsEnding' && !reminded) {
      const players = endingSoon(w).length;
      if (players > 0) out.push({ kind: 'contractsEnding', players });
      reminded = true;
    }
  }
  return out;
}

/**
 * The notes that are news: not before the day the person was hired (the world ran ahead to
 * their first decision), and not the requests, which the to-do carries.
 */
export function newsOf(w: CareerWorld): Note[] {
  return (w.inbox ?? []).filter(
    (n) =>
      !ASKING.has(n.kind) &&
      (n.kind === 'welcome' || n.kind === 'hired' || n.day >= (w.hiredDay ?? 0)),
  );
}
