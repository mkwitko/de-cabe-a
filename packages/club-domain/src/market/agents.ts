/**
 * Agents (ADR-022). Every player has one; a few big agencies hold the best players, many small
 * agents the rest. An agent is fictional (a generated name, never a claim about a real person)
 * and fixed per pack: who he is, his traits and his network are drawn from hashes, not stored.
 * The person's club's standing with each agent moves with what happens between them and is the
 * only part kept in the save (`w.agents`). Every number is a PARÂMETRO.
 */
import type { CareerWorld } from '../career/advance';
import { FIRST_NAMES, LAST_NAMES } from '../generate/names';
import { WHOLE, cached } from '../lib/pack-cache';
import type { Pack, PackPlayer } from '../pack/schema';
import { note } from '../career/inbox';
import { squadPlanOf, fitFor } from './plan';
import { ABROAD } from './abroad';
import { booksOf } from './books';
import { seenLevel } from './judgement';
import { hearOf } from './scouting';
import { cannotTalk } from './talks';
import { readingsOf } from './value';

export interface Agent {
  id: string;
  name: string;
  /** 'big' agency, 'mid' agent or 'small' agent. */
  size: 'big' | 'mid' | 'small';
  /** Commission on a fee, in percent (5..15). */
  greed: number;
  /** Rounds of a negotiation before he hardens (1..4). */
  patience: number;
  /** 1..5: how many clubs he works with. */
  influence: number;
  /** The state his office is in; his network leans there. */
  state: string | null;
}

/** The person's club's record with each agent: standing and what it has seen of him. */
export interface AgentLedger {
  /** Standing with each agent beyond his base affinity, -30..30. */
  affinity: Record<string, number>;
  /** Deals closed or broken with each agent: each reveals one more trait. */
  dealt: Record<string, number>;
  /** Players agents offered the club, with the season: offered once a season each. */
  offered?: Record<string, number>;
}

const COUNT = { big: 6, mid: 30, small: 120 } as const;
/** Level from which a player is a big agency's, and from which a mid agent's (by draw). */
const BIG_LEVEL = 66;
const MID_LEVEL = 58;
/** The club reputation each size of agent works with most (0..100). */
const TARGET_REPUTATION = { big: 85, mid: 55, small: 25 } as const;
/** Clubs in an agent's network per point of influence. */
const CLUBS_PER_INFLUENCE = 3;
/** A deal closed with an agent, or a talk broken. */
export const AFFINITY_DEAL = 10;
export const AFFINITY_BROKEN = -5;
const AFFINITY_MAX = 30;

function hash(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    h = Math.imul(h ^ 124, 16777619);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return h >>> 0;
}
const pick = (n: number, ...parts: (string | number)[]) => hash(...parts) % n;

/** Every agent of the pack, by id. */
export const agentsOf = (pack: Pack): Map<string, Agent> =>
  cached(pack, 'agents', WHOLE, () => {
    const states = [...new Set(pack.cities.map((c) => c.state))].sort();
    const out = new Map<string, Agent>();
    for (const size of ['big', 'mid', 'small'] as const)
      for (let i = 0; i < COUNT[size]; i++) {
        const id = `agent:${size}:${i}`;
        const greedBase = size === 'big' ? 10 : size === 'mid' ? 7 : 5;
        out.set(id, {
          id,
          name: `${FIRST_NAMES[pick(FIRST_NAMES.length, id, 'f')]} ${LAST_NAMES[pick(LAST_NAMES.length, id, 'l')]}`,
          size,
          greed: greedBase + pick(6, id, 'g'),
          patience: 1 + pick(4, id, 'p'),
          influence:
            size === 'big'
              ? 4 + pick(2, id, 'i')
              : size === 'mid'
                ? 2 + pick(2, id, 'i')
                : 1 + pick(2, id, 'i'),
          state: states.length ? states[pick(states.length, id, 's')]! : null,
        });
      }
    return out;
  });

/** The agent of a player: drawn once per pack, by his level. */
export function agentOf(pack: Pack, p: PackPlayer): Agent {
  const level = readingsOf(pack).get(p.id)?.level ?? 0;
  const size =
    level >= BIG_LEVEL ? 'big' : level >= MID_LEVEL && pick(3, p.id, 'm') > 0 ? 'mid' : 'small';
  return agentsOf(pack).get(`agent:${size}:${pick(COUNT[size], p.id, 'a')}`)!;
}

/**
 * The clubs an agent works with: a fixed draw by his influence, leaning to clubs of his size and
 * to his own state. Cached per pack.
 */
export function networkOf(pack: Pack, agent: Agent): Set<string> {
  const all = cached(pack, 'agentNetworks', WHOLE, () => new Map<string, Set<string>>());
  let net = all.get(agent.id);
  if (net) return net;
  const cities = new Map(pack.cities.map((c) => [c.id, c.state]));
  const ranked = pack.clubs
    .map((c) => ({
      id: c.id,
      // Clubs of his size first (a big agency the big clubs, a small agent the small ones),
      // more so in his own state, then a draw.
      score:
        -Math.abs(c.reputation - TARGET_REPUTATION[agent.size]) * 10 +
        (cities.get(c.cityId) === agent.state ? 300 : 0) +
        (hash(agent.id, c.id) % 400),
    }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  net = new Set(ranked.slice(0, agent.influence * CLUBS_PER_INFLUENCE).map((x) => x.id));
  all.set(agent.id, net);
  return net;
}

/** The person's club's standing with an agent: in his network or not, plus what happened. */
export function affinity(w: CareerWorld, agent: Agent): number {
  const base = networkOf(w.pack, agent).has(w.clubId) ? 10 : 0;
  return base + (w.agents?.affinity[agent.id] ?? 0);
}

/** Records a deal closed (or a talk broken) with an agent. */
export function dealtWith(w: CareerWorld, agent: Agent, closed: boolean): void {
  const ledger = w.agents ?? { affinity: {}, dealt: {} };
  const now = ledger.affinity[agent.id] ?? 0;
  const next = Math.max(
    -AFFINITY_MAX,
    Math.min(AFFINITY_MAX, now + (closed ? AFFINITY_DEAL : AFFINITY_BROKEN)),
  );
  w.agents = {
    ...ledger,
    affinity: { ...ledger.affinity, [agent.id]: next },
    dealt: { ...ledger.dealt, [agent.id]: (ledger.dealt[agent.id] ?? 0) + 1 },
  };
}

/** Traits the person's club has seen of an agent: one per deal, greed first. */
export function seenTraits(
  w: CareerWorld,
  agent: Agent,
): { greed?: number; patience?: number; influence?: number } {
  const n = w.agents?.dealt[agent.id] ?? 0;
  return {
    ...(n >= 1 && { greed: agent.greed }),
    ...(n >= 2 && { patience: agent.patience }),
    ...(n >= 3 && { influence: agent.influence }),
  };
}

/** Commission on a deal: a share of the fee, or months of wage for a player without a club. */
export function commission(agent: Agent, fee: number, wage: number): number {
  const raw = fee > 0 ? (fee * agent.greed) / 100 : wage * Math.round(agent.greed / 2.5);
  return Math.round(raw / 1000) * 1000;
}

/** A club of the world pays an agent's commission: it counts in its season's spending. */
export function aiCommission(
  w: CareerWorld,
  clubId: string,
  p: PackPlayer,
  fee: number,
  wage: number,
) {
  const amount = commission(agentOf(w.pack, p), fee, wage);
  if (amount <= 0) return;
  const b = booksOf(w, clubId);
  w.books = { ...w.books, [clubId]: { ...b, spent: b.spent + amount } };
}

/** Players offered in one market round, at most; what an agent's pitch makes the club know. */
const OFFERS_PER_ROUND = 2;
const PITCH = 40;

/**
 * Agents who work with the person's club (standing above zero) offer it players of theirs who
 * fit what the squad needs: free agents and players their clubs have no use for. At most
 * OFFERS_PER_ROUND a round, each once a season, best first as the club's eye ranks them; the
 * club then knows them as the agent tells it (PITCH). Returns the players offered.
 */
export function agentOffers(w: CareerWorld, day: number): PackPlayer[] {
  const season = w.season.season;
  const plan = squadPlanOf({ pack: w.pack, clubId: w.clubId });
  const needs = [...plan.needs, ...(plan.upgrade ? [plan.upgrade] : [])];
  if (needs.length === 0) return [];
  const me = { pack: w.pack, clubId: w.clubId };
  const spare = new Map<string, Set<string>>();
  const surplus = (clubId: string) => {
    let s = spare.get(clubId);
    if (!s) spare.set(clubId, (s = new Set(squadPlanOf({ pack: w.pack, clubId }).surplus)));
    return s;
  };
  const offered = w.agents?.offered ?? {};
  const pool = w.pack.players
    .filter((p) => {
      if (p.clubId === w.clubId || p.clubId === ABROAD || offered[p.id] === season) return false;
      if (p.clubId !== null && !surplus(p.clubId).has(p.id)) return false;
      if (affinity(w, agentOf(w.pack, p)) <= 0) return false;
      if (!needs.some((n) => fitFor(me, p, n) >= n.wanted - 1)) return false;
      return cannotTalk(w, p) === null;
    })
    .map((p) => ({ p, seen: seenLevel(w.pack, w.clubId, p) }))
    .sort((a, b) => b.seen - a.seen || (a.p.id < b.p.id ? -1 : 1))
    .slice(0, OFFERS_PER_ROUND)
    .map((x) => x.p);
  for (const p of pool) {
    const agent = agentOf(w.pack, p);
    hearOf(w, p, PITCH, day);
    w.agents = {
      affinity: w.agents?.affinity ?? {},
      dealt: w.agents?.dealt ?? {},
      offered: { ...(w.agents?.offered ?? {}), [p.id]: season },
    };
    note(w, {
      day,
      kind: 'agentOffer',
      player: p.knownAs ?? p.name,
      agent: agent.name,
      club: p.clubId ?? '',
    });
  }
  return pool;
}
