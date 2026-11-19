/**
 * After the board ends the job (06 §5.3): the career goes on at another club. The offers come
 * from a step down, clubs weaker than the one that let the person go, and taking one moves the
 * person there in the same world, on the same day: the season, the players and the other clubs
 * are untouched; what was the person's own at the old club (eleven, training, talks, cash) is
 * left behind. Same world, same offers.
 */
import { fork, next, rngFrom } from '@decabeca/match-engine';
import { createLedger } from '../finance/ledger';
import { divisionTable, type CareerWorld } from './advance';
import { goalFor, positionOf } from './board';
import { note } from './inbox';
import { approaches } from './coaches';
import { nationalDivisions } from './start';

/** PARÂMETRO: how many clubs call after a dismissal. */
const OFFERS = 3;

/**
 * The clubs that offer the job to a dismissed coach: weaker than the old club, from its
 * division and those below, the nearest in strength first drawn by the seed. Empty while the
 * person has a job. The weakest club of the pack still gets offers: any club of the last division.
 */
export function jobsAfter(w: CareerWorld): string[] {
  if (!w.board?.fired) return [];
  // First the clubs that sacked their coach and have not hired yet, a step down.
  const below = w.strength.get(w.clubId) ?? 0;
  const open = Object.keys(w.vacancies ?? {})
    .filter((id) => id !== w.clubId && (w.strength.get(id) ?? 0) < below)
    .sort((a, b) => (w.strength.get(b) ?? 0) - (w.strength.get(a) ?? 0) || (a < b ? -1 : 1))
    .slice(0, OFFERS);
  if (open.length >= OFFERS) return open;
  const divs = nationalDivisions(w.pack);
  const tier = divs.find((d) => w.season.members[d.id]?.includes(w.clubId))?.tier ?? 1;
  const mine = w.strength.get(w.clubId) ?? 0;
  const pool = divs
    .filter((d) => d.tier >= tier)
    .flatMap((d) => w.season.members[d.id] ?? d.clubIds)
    .filter((id) => id !== w.clubId);
  const weaker = pool.filter((id) => (w.strength.get(id) ?? 0) < mine);
  const from = weaker.length >= OFFERS ? weaker : pool;
  // The dozen nearest below, then three of them by the seed and the day: not always the same.
  const near = [...from]
    .sort((a, b) => (w.strength.get(b) ?? 0) - (w.strength.get(a) ?? 0) || (a < b ? -1 : 1))
    .slice(0, 12);
  const r = fork(rngFrom(w.seed), `jobs:${w.season.season}:${w.day}`);
  const out = [...open];
  const rest = near.filter((id) => !open.includes(id));
  while (out.length < OFFERS && rest.length > 0)
    out.push(rest.splice(Math.floor(next(r) * rest.length), 1)[0]!);
  return out;
}

/**
 * Takes one of the offers, after a dismissal or a club's approach while in a job: the person is
 * now that club's coach, with a board that starts over; the club left behind looks for another.
 */
export function takeJob(w: CareerWorld, clubId: string): void {
  if (!jobsAfter(w).includes(clubId) && !approaches(w).includes(clubId))
    throw new Error('job: not offered');
  const club = w.pack.clubs.find((c) => c.id === clubId)!;
  const vacancies = { ...w.vacancies, [w.clubId]: w.day };
  delete vacancies[clubId];
  w.vacancies = vacancies;
  delete w.benches?.[clubId];
  w.clubId = clubId;
  w.hired = w.season.season;
  // ponytail: the other clubs keep no ledger, so the new club's cash is the pack's opening
  // cash; its real cash when rivals have books (04 §4.1).
  w.ledger = createLedger(w.day, [
    {
      key: `opening-cash:${clubId}:${w.day}`,
      kind: 'opening',
      ref: 'pack',
      amount: club.initialCash,
      day: w.day,
      dueDay: w.day,
    },
  ]);
  for (const k of [
    'lineup',
    'training',
    'talks',
    'bids',
    'listed',
    'forLoan',
    'academy',
    'injuries',
    'arrears',
    'starts',
    'played',
  ] as const)
    delete w[k];
  // A season taken over half-way is not judged by what the last coach left: the goal is the
  // squad's place or the place the club is in today, whichever asks less.
  w.board = {
    confidence: 60,
    goal: Math.min(divisionTable(w).rows.length, Math.max(goalFor(w), positionOf(w))),
  };
  note(w, { day: w.day, kind: 'hired', club: clubId });
}
