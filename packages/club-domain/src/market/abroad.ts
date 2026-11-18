/**
 * The exodus abroad: foreign clubs buying the league's players. The pack holds Brazilian clubs
 * only, so the foreign market is a handful of virtual buyers by tier, not clubs with squads:
 * each round of a window, every player of a club with fixtures this season may draw an offer
 * from the best tier his level and age reach. The chance grows with how visible his club is
 * (its division) and peaks in July, when Europe's summer window is open. A club of the world
 * sells whenever its squad can spare him; the person's club gets a bid to answer.
 *
 * A player sold abroad keeps his place in the pack under the club id `ABROAD`, with no wage
 * the league pays: no club here can sign him, field him or count him.
 * Players come home too (`homecoming`): veterans at the end of their careers and moves that did
 * not work out, to a club here that needs them, at the opening of each window.
 * Every number here is a PARÂMETRO, to be calibrated against the real yearly exodus.
 */
import { next, rngFrom } from '@decabeca/match-engine';
import type { CareerWorld } from '../career/advance';
import { note } from '../career/inbox';
import { movePlayer, windowOf } from '../career/market';
import { squadPlayers } from '../career/squad';
import { seedOf } from '../competition/season';
import type { PackPlayer } from '../pack/schema';
import { booksOf, solidarity, tierOfClub, wageRoom } from './books';
import { CLAUSE_TIMES, playerStance, type PlayerStance } from './deals';
import { fitFor, squadPlanOf } from './plan';
import { ROUND_DAYS, type Deal } from './rounds';
import { canLose } from './talks';
import { isImport } from '../career/development';
import { ageOf, marketValue, readingsOf, thousands } from './value';

/** Where a player sold abroad sits in the pack. */
export const ABROAD = 'abroad';

export interface ForeignTier {
  id: string;
  name: string;
  /** Level the player must have, or the ceiling of a young talent. */
  level: number;
  /** Ages the tier buys. */
  ages: [number, number];
  /** Chance of an offer over a whole season of windows, in tenths of a percent, at Série A. */
  chance: number;
  /** Fee as a percentage of his value. */
  pays: number;
}

/** Best first: a player gets offers from the first tier he reaches. */
export const FOREIGN_TIERS: readonly ForeignTier[] = [
  { id: 'abroad:eu1', name: 'Elite europeia', level: 73, ages: [17, 24], chance: 450, pays: 200 },
  { id: 'abroad:eu2', name: 'Europa', level: 68, ages: [18, 27], chance: 260, pays: 140 },
  { id: 'abroad:gulf', name: 'Golfo Pérsico', level: 66, ages: [25, 33], chance: 180, pays: 130 },
  { id: 'abroad:asia', name: 'Ásia e EUA', level: 62, ages: [20, 31], chance: 150, pays: 110 },
  { id: 'abroad:minor', name: 'Exterior', level: 57, ages: [20, 30], chance: 100, pays: 100 },
];

/** A young talent's ceiling that the elite tier buys on promise. */
const PROMISE = 80;
const PROMISE_AGE = 21;
/** How visible a division is to foreign scouts, in percent of Série A. */
const VISIBILITY = [0, 100, 70, 45, 30];
/**
 * Share of a season's offers that come in the second window (Europe's summer); the rest in
 * the first. The domestic window in March is for clubs here only.
 */
const SECOND = 60;
/** Rounds in each window (rounds.ts: one every 14 days). */
const ROUNDS_FIRST = 4;
const ROUNDS_SECOND = 4;
/** A player loyal and unambitious enough stays home (personality on 1..20). */
const STAYS = { loyalty: 16, ambition: 8 };
/** Years of the contract he signs abroad. */
const YEARS_ABROAD = 4;
/**
 * Chance a player abroad comes home in a year, per mille, by age: the veteran back for his last
 * seasons, the young one whose move did not work out. Half in each window. PARÂMETRO.
 */
const HOME_BY_AGE: readonly [number, number][] = [
  [23, 60],
  [28, 80],
  [31, 160],
  [33, 320],
  [99, 500],
];
/** Seasons abroad before he may come home. */
const HOME_AFTER = 1;

export const isAbroad = (id: string | null) => id !== null && id.startsWith(ABROAD);

/** The face of a foreign buyer or of the abroad bucket, for lists and the inbox. */
export const foreignName = (id: string) =>
  FOREIGN_TIERS.find((t) => t.id === id)?.name ?? (id === ABROAD ? 'Exterior' : id);

// ── Bringing players in (04 §4.7) ────────────────────────────────────────────

/** Over his value a club pays to bring a player from abroad; the fee leaves the league. */
const IMPORT_PREMIUM = 20;
/** Over the wage he would ask at home a player wants to come from abroad. */
const IMPORT_WAGE = 25;
/**
 * A player abroad a club of the league can sign: the year's foreign market. Those sold from
 * here come home by themselves (`homecoming`). `season` kept for the callers' reading.
 */
export const signable = (p: PackPlayer, _season: number) => p.clubId === ABROAD && isImport(p.id);

/** The fee to bring him from abroad. */
export const importFee = (w: CareerWorld, p: PackPlayer) =>
  thousands((marketValue(w.pack, p, w.season.season) * (100 + IMPORT_PREMIUM)) / 100);

/** What he wants to sign for `buyerId`, coming from his club, from nowhere or from abroad. */
export function stanceFor(w: CareerWorld, p: PackPlayer, buyerId: string): PlayerStance {
  const club = (id: string) => w.pack.clubs.find((x) => x.id === id)!;
  const from = p.clubId === null || p.clubId === ABROAD ? null : club(p.clubId);
  const s = playerStance(w.pack, p, from, club(buyerId), w.season.season);
  return p.clubId === ABROAD ? { ...s, wage: Math.round((s.wage * (100 + IMPORT_WAGE)) / 100) } : s;
}

/** The tier that would buy him, or null. */
export function tierFor(w: CareerWorld, p: PackPlayer): ForeignTier | null {
  const r = readingsOf(w.pack).get(p.id)!;
  const age = ageOf(p, w.season.season);
  for (const t of FOREIGN_TIERS) {
    if (age < t.ages[0] || age > t.ages[1]) continue;
    const promise = t === FOREIGN_TIERS[0] && age <= PROMISE_AGE && r.ceiling >= PROMISE;
    if (r.level >= t.level || promise) return t;
  }
  return null;
}

export const wantsToGo = (p: PackPlayer) =>
  !(p.personality.loyalty >= STAYS.loyalty && p.personality.ambition <= STAYS.ambition);

/** The fee a tier offers for him. */
export const foreignFee = (w: CareerWorld, p: PackPlayer, t: ForeignTier) =>
  thousands((marketValue(w.pack, p, w.season.season) * t.pays) / 100);

/** Sends a player abroad: he leaves the league for good; the fee goes to his club's season. */
export function sellAbroad(w: CareerWorld, p: PackPlayer, fee: number): void {
  const from = p.clubId!;
  movePlayer(w, p, ABROAD, { wage: 0, until: `${w.season.season + YEARS_ABROAD}-12-31` });
  const got = booksOf(w, from);
  w.books = { ...w.books, [from]: { ...got, earned: got.earned + fee } };
  solidarity(w, p, from, fee, true);
}

/** One round of foreign offers. Returns the sales between the world's clubs and abroad. */
export function foreignRound(w: CareerWorld, day: number): Deal[] {
  const window = windowOf(day);
  if (window !== 'first' && window !== 'second') return [];
  const share = window === 'second' ? SECOND / ROUNDS_SECOND : (100 - SECOND) / ROUNDS_FIRST;
  const draw = rngFrom(seedOf(w.seed, `abroad:${day}`));
  const done: Deal[] = [];
  const clubs = [...w.season.calendar.byClub.keys()].sort();
  for (const clubId of clubs) {
    const seen = VISIBILITY[tierOfClub(w, clubId)] ?? 0;
    // One draw per player of the squad, in the squad's order, whatever happens: a sale earlier
    // in the list never shifts the draws of the rest.
    for (const p of squadPlayers({ pack: w.pack, clubId })) {
      const roll = next(draw);
      if (w.loans?.[p.id] || w.moves?.[p.id]?.season === w.season.season) continue;
      const t = tierFor(w, p);
      if (!t) continue;
      // chance (per mille a season) × visibility × this round's share of the season.
      if (roll * 10_000_000 >= t.chance * seen * share) continue;
      if (!wantsToGo(p) || !canLose(w, p)) continue;
      const fee = foreignFee(w, p, t);
      if (clubId === w.clubId) {
        const id = `${day}:${t.id}:${p.id}`;
        if (w.cold?.[`${t.id}:${p.id}`] === w.season.season) continue;
        if ((w.bids ?? []).some((b) => b.player === p.id)) continue;
        w.bids = [
          ...(w.bids ?? []),
          {
            id,
            player: p.id,
            from: t.id,
            fee,
            most: thousands((fee * 125) / 100),
            round: 1,
            day,
            why: { need: 0, fit: 0, growth: 0, resale: 0, cost: 0, wages: 0 },
          },
        ];
        note(w, { day, kind: 'bid', player: p.knownAs ?? p.name, club: t.id, fee });
        continue;
      }
      sellAbroad(w, p, fee);
      done.push({
        day,
        player: p.id,
        name: p.knownAs ?? p.name,
        from: clubId,
        to: t.id,
        fee,
        wage: 0,
        years: YEARS_ABROAD,
        role: 'starter',
        for: 'starter',
        seen: readingsOf(w.pack).get(p.id)!.level,
        why: { need: 0, fit: 0, growth: 0, resale: 0, cost: 0, wages: 0 },
      });
    }
  }
  if (done.length) w.deals = [...(w.deals ?? []), ...done].slice(-80);
  return done;
}

/**
 * Players abroad coming home: on the first round of each international window, every
 * player abroad for HOME_AFTER seasons or more draws once, by age. One who wants to come home
 * goes to the club here with the best name among those that need him at his position (a hole
 * or an upgrade his level meets) and can pay his wage; with no such club he stays abroad and
 * tries again next window. The person's club is not among them yet. Returns the moves.
 */
export function homecoming(w: CareerWorld, day: number): Deal[] {
  // The first round of each international window only.
  const window = windowOf(day);
  if ((window !== 'first' && window !== 'second') || windowOf(day - ROUND_DAYS) === window)
    return [];
  const season = w.season.season;
  const draw = rngFrom(seedOf(w.seed, `home:${day}`));
  const read = readingsOf(w.pack);
  const clubs = w.pack.clubs
    .filter((c) => c.id !== w.clubId && w.season.calendar.byClub.has(c.id))
    .sort((a, b) => b.reputation - a.reputation || (a.id < b.id ? -1 : 1));
  const done: Deal[] = [];
  // In the pack's order, one draw each, whatever happens.
  for (const p of w.pack.players) {
    if (p.clubId !== ABROAD) continue;
    const roll = next(draw);
    const left = w.moves?.[p.id]?.joined ?? w.moves?.[p.id]?.season ?? season;
    if (season - left < HOME_AFTER) continue;
    const age = ageOf(p, season);
    const chance = HOME_BY_AGE.find(([until]) => age <= until)![1];
    // Per mille a year, half of it in each window.
    if (roll * 2000 >= chance) continue;
    const r = read.get(p.id)!;
    for (const c of clubs) {
      const plan = squadPlanOf({ pack: w.pack, clubId: c.id });
      const need = [...plan.needs, ...(plan.upgrade ? [plan.upgrade] : [])].find(
        (n) =>
          n.keeper === r.keeper &&
          fitFor({ pack: w.pack, clubId: c.id }, p, n) >= n.wanted &&
          fitFor({ pack: w.pack, clubId: c.id }, p, n) <= n.wanted + 12,
      );
      if (!need) continue;
      const wants = playerStance(w.pack, p, null, c, season);
      if (wants.no || wants.wage > wageRoom(w, c.id)) continue;
      movePlayer(w, p, c.id, {
        wage: wants.wage,
        until: `${season + wants.years}-12-31`,
        release: marketValue(w.pack, p, season) * CLAUSE_TIMES,
      });
      done.push({
        day,
        player: p.id,
        name: p.knownAs ?? p.name,
        from: ABROAD,
        to: c.id,
        fee: 0,
        wage: wants.wage,
        years: wants.years,
        role: wants.fair,
        for: need.kind,
        seen: r.level,
        why: { need: 0, fit: 0, growth: 0, resale: 0, cost: 0, wages: 0 },
      });
      break;
    }
  }
  if (done.length) w.deals = [...(w.deals ?? []), ...done].slice(-80);
  return done;
}
