/**
 * Stadium operation (mapa de conhecimento §2.11, entrega 8): who comes to a home match, what
 * they pay, and the matches a club plays behind closed doors after the sports court (STJD)
 * takes its home ground away.
 *
 * - The usual crowd is the stadium's capacity times `fans.demand`, read as the share of seats a
 *   club fills on an ordinary league day. The importer sets it from the 2025 averages (ge,
 *   mktesportivo: scripts/club-pack/data/attendance.json).
 * - The ticket is the tier's average moved by `fans.priceSensitivity`: fans who count every real
 *   pay less (Ceará R$ 21, Vasco R$ 76 against R$ 51 in Série A, 2025).
 * - A derby, a bigger visitor or a knockout tie bring more people, up to the capacity.
 * - Closed doors (RGC art. 64): after trouble at a home match the club loses one or two home
 *   matches, rarely six to eight after a riot (Vitória 2025, Ceará, Santos), served from the
 *   second home match after it, since the court takes a while to judge.
 *
 * Pure functions of the pack and the season, so the season and the save agree without state.
 * Integers only (ADR-020). Every number is a PARÂMETRO.
 */
import type { SeasonState } from '../competition/season';
import { seedOf } from '../competition/season';
import { cached, WHOLE } from '../lib/pack-cache';
import type { Pack, PackClub } from '../pack/schema';

const clubOf = (pack: Pack, id: string): PackClub | undefined =>
  cached(pack, 'stadium:clubs', WHOLE, () => new Map(pack.clubs.map((c) => [c.id, c]))).get(id);

/** Average ticket by national tier, R$: Série A 51 (2025, Máquina do Esporte), B 26 (gate over public, mktesportivo 2025); C and D a confirmar. */
export const TICKET_BY_TIER: Record<number, number> = { 1: 51, 2: 26, 3: 18, 4: 12 };

/** Paying public on an ordinary home league day. */
export const usualCrowd = (c: Pick<PackClub, 'stadium' | 'fans'>): number =>
  Math.round((c.stadium.capacity * c.fans.demand) / 100);

/** The club's average ticket in a tier: from 25 % to twice the tier's, by price sensitivity. */
export const ticketOf = (c: Pick<PackClub, 'fans'>, tier: number): number =>
  Math.round(
    ((TICKET_BY_TIER[tier] ?? TICKET_BY_TIER[4]!) *
      Math.max(25, 200 - 2 * c.fans.priceSensitivity)) /
      100,
  );

/** Extra public, per cent: a derby, a knockout tie; a visitor more famous than the host. a confirmar. */
const DERBY = 30;
const KNOCKOUT = 20;
const BIG_VISITOR_MAX = 20;

/** Trouble at a home match, per thousand: any match, a derby, a home defeat. a confirmar. */
const INCIDENT = 3;
const INCIDENT_DERBY = 15;
const INCIDENT_LOSS = 2; // multiplier

export const derby = (home: PackClub, away: PackClub): boolean =>
  home.rivals.includes(away.id) || away.rivals.includes(home.id);

/** The home side's league and cup matches of the season, in date order. */
function homeMatches(s: SeasonState, clubId: string) {
  return [...(s.calendar.byClub.get(clubId) ?? [])]
    .filter((m) => m.home === clubId)
    .sort((a, b) => a.day - b.day || (a.id < b.id ? -1 : 1));
}

const sentences = new WeakMap<SeasonState, Map<string, number>>();

/** Home matches lost to the court after trouble at `id`, 0 when nothing happened. */
export function punishmentAt(pack: Pack, s: SeasonState, id: string): number {
  if (!s.outcomes.has(id)) return 0;
  // A played match's sentence never changes: kept per season.
  let known = sentences.get(s);
  if (!known) sentences.set(s, (known = new Map()));
  let n = known.get(id);
  if (n === undefined) known.set(id, (n = judge(pack, s, id)));
  return n;
}

function judge(pack: Pack, s: SeasonState, id: string): number {
  const o = s.outcomes.get(id);
  const m = s.calendar.matches.get(id);
  if (!o || !m) return 0;
  const home = clubOf(pack, m.home);
  const away = clubOf(pack, m.away);
  if (!home || !away) return 0;
  const chance =
    (derby(home, away) ? INCIDENT_DERBY : INCIDENT) * (o.goals[0] < o.goals[1] ? INCIDENT_LOSS : 1);
  const roll = seedOf(s.seed, `incident:${id}`) % 1000;
  if (roll >= chance) return 0;
  const size = seedOf(s.seed, `sentence:${id}`) % 100;
  return size < 80 ? 1 : size < 95 ? 2 : 6;
}

/** Whether the home side plays `id` behind closed doors. */
export function closedDoors(pack: Pack, s: SeasonState, id: string): boolean {
  const m = s.calendar.matches.get(id);
  if (!m) return false;
  const list = homeMatches(s, m.home);
  const at = list.findIndex((x) => x.id === id);
  // The trial comes a home match later; the sentence runs over the next ones.
  for (let i = 0; i < at - 1; i++) {
    const n = punishmentAt(pack, s, list[i]!.id);
    if (n && at >= i + 2 && at < i + 2 + n) return true;
  }
  return false;
}

/** Paying public at match `id`: 0 behind closed doors, else the usual crowd moved by the match. */
export function crowdAt(pack: Pack, s: SeasonState, id: string): number {
  const m = s.calendar.matches.get(id);
  if (!m) return 0;
  const home = clubOf(pack, m.home);
  const away = clubOf(pack, m.away);
  if (!home || !away || closedDoors(pack, s, id)) return 0;
  const phase = s.meta.get(id)?.ko ? KNOCKOUT : 0;
  const pull = Math.min(BIG_VISITOR_MAX, Math.max(0, away.reputation - home.reputation) >> 1);
  const extra = 100 + (derby(home, away) ? DERBY : 0) + phase + pull;
  return Math.min(home.stadium.capacity, Math.round((usualCrowd(home) * extra) / 100));
}

/** Share of the seats taken, 0..1, as the match engine reads the crowd. */
export function crowdShare(pack: Pack, s: SeasonState, id: string): number {
  const m = s.calendar.matches.get(id);
  const cap = (m ? clubOf(pack, m.home) : undefined)?.stadium.capacity ?? 0;
  return cap > 0 ? Math.min(1, crowdAt(pack, s, id) / cap) : 0;
}
