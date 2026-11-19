/**
 * The person's club money as the days go by (04 §4, MC-175 ledger): wages, TV and sponsors on
 * the first day of each month, gate money at each home match. Everything is a ledger entry with
 * an idempotency key, so replaying a day never pays twice. Rivals get their season summary from
 * the same rules later (04 §4.1).
 */
import { dayOf, isoOf } from '../competition/calendar';
import { postEntry } from '../finance/ledger';
import type { PackClub } from '../pack/schema';
import type { CareerWorld } from './advance';
import { PRICE_BASE, priced, pricesOf } from './prices';
import { upkeepOf } from './clubs';
import { nationalDivisions } from './start';
import { closedDoors, crowdAt, punishmentAt, ticketOf, usualCrowd } from '../match/stadium';
import { note } from './inbox';

/**
 * PARÂMETRO by national tier (04 §4, table "Milhões de reais por temporada", middle of each
 * range): TV and quotas per season, and the average ticket price.
 */
/** Share of a season's TV money paid as prize to the champion; the last place gets 1/n of it. */
const PRIZE_SHARE = 4;

export const BY_TIER: Record<number, { tv: number }> = {
  1: { tv: 120_000_000 },
  2: { tv: 14_500_000 },
  // Série C 2025: R$ 32 mi in quotas and prizes plus R$ 3 mi extra over 20 clubs (Soccerway, A União).
  3: { tv: 1_750_000 },
  4: { tv: 500_000 },
};

const DEBT_MONTHS = 60;
/**
 * Interest on the old debt, percent a year: Brazilian clubs' debt is mostly tax debt renegotiated
 * at the Selic rate and bank loans above it (PARÂMETRO; the audited accounts split it by kind for
 * a few clubs only).
 */
export const DEBT_RATE = 10;
/** Home league matches counted for a season's gate (19 in a 20-club league). */
const HOME_MATCHES = 19;

/** Paying public a club draws on an ordinary home day (match/stadium.ts). */
export const gateOf = usualCrowd;

/** What a club takes in a season in a tier: TV, sponsors and the gate of its home matches. */
export const seasonIncome = (
  c: Pick<PackClub, 'stadium' | 'fans' | 'sponsors'>,
  tier: number,
  prices = PRICE_BASE,
) =>
  priced(
    BY_TIER[tier]!.tv +
      c.sponsors.reduce((s, x) => s + x.annual, 0) +
      gateOf(c) * ticketOf(c, tier) * HOME_MATCHES,
    prices,
  );

export function tierOf(w: CareerWorld): number {
  const div = nationalDivisions(w.pack).find((d) => w.season.members[d.id]?.includes(w.clubId));
  return div?.tier ?? 4;
}

/** Paying public the person's club draws on an ordinary home day. */
export function attendance(w: CareerWorld): number {
  return gateOf(w.pack.clubs.find((x) => x.id === w.clubId)!);
}

function monthlyBills(w: CareerWorld, day: number) {
  const month = isoOf(day).slice(0, 7);
  const tier = BY_TIER[tierOf(w)]!;
  const club = w.pack.clubs.find((c) => c.id === w.clubId)!;
  const wages =
    w.pack.players.reduce((s, p) => s + (p.clubId === w.clubId ? (p.contract?.wage ?? 0) : 0), 0) +
    w.pack.assignments.reduce((s, a) => s + (a.clubId === w.clubId ? a.contract.wage : 0), 0);
  const sponsors = club.sponsors
    .filter((x) => x.until >= isoOf(day))
    .reduce((s, x) => s + x.annual, 0);
  const post = (kind: string, amount: number) =>
    amount !== 0 &&
    postEntry(w.ledger, {
      key: `${kind}:${month}`,
      kind,
      ref: `month:${month}`,
      amount,
      day,
      dueDay: day,
    });
  post('wages', -wages);
  // The structure's upkeep, a twelfth of the season's each month (clubs.ts).
  post('upkeep', -Math.round(upkeepOf(w, club) / 12));
  // PARÂMETRO: the pack's debt in 60 monthly instalments (five years), with interest on what is
  // still owed (DEBT_RATE a year).
  const paid = w.ledger.entries.filter((e) => e.kind === 'debt').length;
  if (paid < DEBT_MONTHS) {
    const owed = club.initialDebt - Math.round((club.initialDebt * paid) / DEBT_MONTHS);
    post('debt', -Math.round(club.initialDebt / DEBT_MONTHS));
    post('interest', -Math.round((owed * DEBT_RATE) / 1200));
  }
  const { prices } = pricesOf(w);
  post('tv', Math.round(priced(tier.tv, prices) / 12));
  post('sponsors', Math.round(priced(sponsors, prices) / 12));
}

/** Bills of every month that starts after `from` and on or before `to`. */
export function postMonths(w: CareerWorld, from: number, to: number) {
  // A career's money starts with its first season.
  const start = Math.max(from + 1, dayOf(`${w.season.season}-01-01`));
  for (let d = start; d <= to; d++) if (isoOf(d).endsWith('-01')) monthlyBills(w, d);
}

/** Gate money of the person's home match. */
export function postHomeMatch(w: CareerWorld, matchId: string, day: number) {
  const m = w.season.meta.get(matchId)!;
  if (m.home !== w.clubId) return;
  const club = w.pack.clubs.find((x) => x.id === w.clubId)!;
  const amount = priced(
    crowdAt(w.pack, w.season, matchId) * ticketOf(club, tierOf(w)),
    pricesOf(w).prices,
  );
  if (closedDoors(w.pack, w.season, matchId)) note(w, { day, kind: 'closedDoors' });
  const banned = punishmentAt(w.pack, w.season, matchId);
  if (banned) note(w, { day, kind: 'courtBan', matches: banned });
  postEntry(w.ledger, {
    // Match ids repeat every season: the season is part of the key.
    key: `tickets:${w.season.season}:${matchId}`,
    kind: 'tickets',
    ref: matchId,
    amount,
    day,
    dueDay: day,
  });
}

/**
 * Prize for the final position in the division (or the group), paid at the season's end: the
 * champion takes a quarter of the tier's TV money, each place below a step less. Returns it.
 */
export function postPrize(w: CareerWorld, position: number, places: number): number {
  if (position < 1 || places < 1) return 0;
  const top = priced(BY_TIER[tierOf(w)]!.tv, pricesOf(w).prices) / PRIZE_SHARE;
  const amount = Math.round((top * (places - position + 1)) / places / 1000) * 1000;
  if (amount > 0)
    postEntry(w.ledger, {
      key: `prize:${w.season.season}`,
      kind: 'prize',
      ref: `season:${w.season.season}`,
      amount,
      day: w.ledger.today,
      dueDay: w.ledger.today,
    });
  return amount;
}
