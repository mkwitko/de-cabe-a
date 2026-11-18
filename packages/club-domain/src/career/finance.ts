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
import { BASE, priced, pricesOf } from './prices';
import { nationalDivisions } from './start';

/**
 * PARÂMETRO by national tier (04 §4, table "Milhões de reais por temporada", middle of each
 * range): TV and quotas per season, and the average ticket price.
 */
/** Share of a season's TV money paid as prize to the champion; the last place gets 1/n of it. */
const PRIZE_SHARE = 4;

export const BY_TIER: Record<number, { tv: number; ticket: number }> = {
  1: { tv: 120_000_000, ticket: 60 },
  2: { tv: 14_500_000, ticket: 30 },
  3: { tv: 1_300_000, ticket: 18 },
  4: { tv: 500_000, ticket: 12 },
};

const DEBT_MONTHS = 60;
/** Home matches counted for a season's gate. */
const HOME_MATCHES = 15;

/** Paying public a club draws at home: 3 % to 5 % of the fan base by demand, up to the capacity. */
export const gateOf = (c: Pick<PackClub, 'stadium' | 'fans'>): number =>
  Math.min(c.stadium.capacity, Math.round((c.fans.size * (300 + 2 * c.fans.demand)) / 10_000));

/** What a club takes in a season in a tier: TV, sponsors and the gate of its home matches. */
export const seasonIncome = (
  c: Pick<PackClub, 'stadium' | 'fans' | 'sponsors'>,
  tier: number,
  prices = BASE,
) =>
  priced(
    BY_TIER[tier]!.tv +
      c.sponsors.reduce((s, x) => s + x.annual, 0) +
      gateOf(c) * BY_TIER[tier]!.ticket * HOME_MATCHES,
    prices,
  );

export function tierOf(w: CareerWorld): number {
  const div = nationalDivisions(w.pack).find((d) => w.season.members[d.id]?.includes(w.clubId));
  return div?.tier ?? 4;
}

/** Paying public at a home match: 3 % to 5 % of the fan base by demand, up to the capacity. */
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
  // PARÂMETRO: the pack's debt in 60 monthly instalments (five years), no interest yet.
  const paid = w.ledger.entries.filter((e) => e.kind === 'debt').length;
  if (paid < DEBT_MONTHS) post('debt', -Math.round(club.initialDebt / DEBT_MONTHS));
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
  const amount = priced(attendance(w) * BY_TIER[tierOf(w)]!.ticket, pricesOf(w).prices);
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
