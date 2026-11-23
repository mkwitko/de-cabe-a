/**
 * The person's club money as the days go by (04 §4, MC-175 ledger): wages, TV and sponsors on
 * the first day of each month, gate money at each home match. Everything is a ledger entry with
 * an idempotency key, so replaying a day never pays twice. Rivals get their season summary from
 * the same rules later (04 §4.1).
 */
import { wageCost } from '../market/image';
import { dayOf, isoOf } from '../competition/calendar';
import { postEntry } from '../finance/ledger';
import type { Pack, PackClub } from '../pack/schema';
import type { CareerWorld } from './advance';
import { PRICE_BASE, priced, pricesOf } from './prices';
import { upkeepOf } from './clubs';
import { nationalDivisions } from './start';
import { COTA_MONTHS, cotaFor } from './estadual';
import { closedDoors, crowdAt, punishmentAt, ticketOf, usualCrowd } from '../match/stadium';
import { note } from './inbox';
import { CURRENCIES, rateOf } from '../market/currency';
import { QUOTA, STATE, TV_SERIE_A, TV_SERIE_B, tvOf } from './revenue';

/** A month's move of the rate, in tenths of a percent, that makes news. PARÂMETRO. */
const FX_NEWS = 70;

/**
 * Members' dues (sócio-torcedor) for each 100 of gate money: Série A 2023, R$ 705 mi from
 * members against R$ 806 mi at the gate (Convocados 2024). Clubs that fill their ground sell
 * plans to the same crowd. The ratio is the Série A's; below it is an ESTIMATE, not a target
 * to tune. PARÂMETRO.
 */
export const MEMBERS_PER_GATE = 87;
/**
 * Share of a season's loss the owners cover at the turn, in percent. Below the top flight the
 * accounts do not close on football money: Náutico ran fifteen years in the red on R$ 25-31 mi
 * of revenue (Itatiaia, Diario de Pernambuco 2026). An SAF's investor puts capital in (more a
 * passionate one, less one who bought to sell), a multi-club group more; an association lives
 * on its patrons and councillors' loans. The rest stays as debt. PARÂMETRO.
 */
const OWNERS_COVER = { association: 25, builder: 50, speculator: 30, passionate: 70 } as const;
const GROUP_COVER = 15;

/** What the owners put in to cover `loss` (a positive number) of a club's season. */
export function ownersCover(pack: Pick<Pack, 'governance'>, clubId: string, loss: number): number {
  const g = pack.governance.find((x) => x.clubId === clubId);
  const share =
    OWNERS_COVER[g?.ownerProfile ?? 'association'] + (g?.model === 'groupSaf' ? GROUP_COVER : 0);
  return loss > 0 ? Math.round((loss * share) / 100) : 0;
}

/** The person's club ended the season in the red: the owners' share of the hole, booked. */
export function postOwners(w: CareerWorld): number {
  const amount = ownersCover(w.pack, w.clubId, -w.ledger.cash);
  if (amount > 0)
    postEntry(w.ledger, {
      key: `owners:${w.season.season}`,
      kind: 'owners',
      ref: `season:${w.season.season}`,
      amount,
      day: w.ledger.today,
      dueDay: w.ledger.today,
    });
  return amount;
}

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

/** A season's gate money of the home league matches on ordinary days. */
const seasonGate = (c: Pick<PackClub, 'stadium' | 'fans'>, tier: number) =>
  gateOf(c) * ticketOf(c, tier) * HOME_MATCHES;

/** Members' dues for a season, in a tier (at base prices). */
export const membersOf = (c: Pick<PackClub, 'stadium' | 'fans'>, tier: number) =>
  Math.round((seasonGate(c, tier) * MEMBERS_PER_GATE) / 100);

/**
 * What a club takes in a season in a tier: TV (equal, audience and the mean performance part),
 * the participation quota, the state championship, sponsors, the gate of its home matches and
 * its members' dues. Phases reached and prizes are results (revenue.ts), not budget. `tv` defaults
 * to the tier's mean.
 */
export const seasonIncome = (
  c: Pick<PackClub, 'stadium' | 'fans' | 'sponsors'>,
  tier: number,
  prices = PRICE_BASE,
  tv = tier === 1 ? TV_SERIE_A : tier === 2 ? TV_SERIE_B : 0,
  /** The state championship's fixed share (estadual.ts); the flat estimate of the tier by default. */
  cup = STATE[tier] ?? 0,
) =>
  priced(
    tv +
      (QUOTA[tier] ?? 0) +
      cup +
      c.sponsors.reduce((s, x) => s + x.annual, 0) +
      seasonGate(c, tier) +
      membersOf(c, tier),
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
  const tierNo = tierOf(w);
  const club = w.pack.clubs.find((c) => c.id === w.clubId)!;
  const wages =
    w.pack.players.reduce((s, p) => s + (p.clubId === w.clubId ? wageCost(w, p) : 0), 0) +
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
  // A month the real swung hard against the dollar or the euro: the directors hear of it.
  for (const currency of CURRENCIES) {
    const now = rateOf(w, currency, day);
    const before = rateOf(w, currency, day - 1);
    const change = Math.round(((now - before) * 1000) / before);
    if (Math.abs(change) >= FX_NEWS) note(w, { day, kind: 'fx', currency, rate: now, change });
  }
  const { prices } = pricesOf(w);
  const tv = tvOf(w, w.clubId, tierNo);
  // The performance part of the TV money comes at the season's end, by final position.
  post('tv', Math.round(priced(tv.equal + tv.audience, prices) / 12));
  post('quota', Math.round(priced(QUOTA[tierNo] ?? 0, prices) / 12));
  post('members', Math.round(priced(membersOf(club, tierNo), prices) / 12));
  // The state championship's fixed share (federation and broadcaster), paid in its months in
  // three parts; the prize by position comes when it ends (estadual.ts).
  if (COTA_MONTHS.includes(month.slice(5)))
    post('cups', Math.round(priced(cotaFor(w, w.clubId), prices) / COTA_MONTHS.length));
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
