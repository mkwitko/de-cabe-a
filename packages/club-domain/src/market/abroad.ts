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
 * ponytail: nobody comes back yet; a return home (veterans, failed moves) is its own model.
 * Every number here is a PARÂMETRO, to be calibrated against the real yearly exodus.
 */
import { next, rngFrom } from '@decabeca/match-engine';
import type { CareerWorld } from '../career/advance';
import { note } from '../career/inbox';
import { movePlayer } from '../career/market';
import { squadPlayers } from '../career/squad';
import { isoOf } from '../competition/calendar';
import { seedOf } from '../competition/season';
import type { PackPlayer } from '../pack/schema';
import { booksOf, tierOfClub } from './books';
import type { Deal } from './rounds';
import { canLose } from './talks';
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
  { id: 'abroad:asia', name: 'Ásia e EUA', level: 62, ages: [20, 31], chance: 90, pays: 110 },
  { id: 'abroad:minor', name: 'Exterior', level: 57, ages: [20, 30], chance: 60, pays: 100 },
];

/** A young talent's ceiling that the elite tier buys on promise. */
const PROMISE = 80;
const PROMISE_AGE = 21;
/** How visible a division is to foreign scouts, in percent of Série A. */
const VISIBILITY = [0, 100, 70, 45, 30];
/** Share of a season's offers that come in the July window; the rest in January to April. */
const JULY = 60;
/** Rounds in each window (rounds.ts: one every 14 days): January to April, and July. */
const ROUNDS_EARLY = 8;
const ROUNDS_JULY = 2;
/** A player loyal and unambitious enough stays home (personality on 1..20). */
const STAYS = { loyalty: 16, ambition: 8 };
/** Years of the contract he signs abroad. */
const YEARS_ABROAD = 4;

export const isAbroad = (id: string | null) => id !== null && id.startsWith(ABROAD);

/** The face of a foreign buyer or of the abroad bucket, for lists and the inbox. */
export const foreignName = (id: string) =>
  FOREIGN_TIERS.find((t) => t.id === id)?.name ?? (id === ABROAD ? 'Exterior' : id);

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
}

/** One round of foreign offers. Returns the sales between the world's clubs and abroad. */
export function foreignRound(w: CareerWorld, day: number): Deal[] {
  const july = isoOf(day).slice(5, 7) === '07';
  const share = july ? JULY / ROUNDS_JULY : (100 - JULY) / ROUNDS_EARLY;
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
