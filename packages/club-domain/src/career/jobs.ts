/**
 * After the board ends the job (06 §5.3): the career goes on at another club. The offers come
 * from a step down, clubs weaker than the one that let the person go, and taking one moves the
 * person there in the same world, on the same day: the season, the players and the other clubs
 * are untouched; what was the person's own at the old club (eleven, training, talks, cash) is
 * left behind. Same world, same offers.
 */
import { fork, next, rngFrom } from '@decabeca/match-engine';
import { cashFromEntries, createLedger } from '../finance/ledger';
import { clubsOf } from './clubs';
import { divisionTable, type CareerWorld } from './advance';
import { goalFor, positionOf } from './board';
import { note } from './inbox';
import { approaches } from './coaches';
import { nationalDivisions } from './start';
import { baseOf, bringUp } from './academy';
import { ACADEMY } from './bases';
import { applyMoves } from './market';
import { academyPlayers } from './squad';

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
  const boysLeft = w.bases ? [...academyPlayers(w)] : [];
  const vacancies = { ...w.vacancies, [w.clubId]: w.day };
  delete vacancies[clubId];
  w.vacancies = vacancies;
  delete w.benches?.[clubId];
  delete w.styled;
  // The club left keeps the person's cash in its books; the new one brings its own.
  const clubs = clubsOf(w);
  clubs[w.clubId]!.cash = cashFromEntries(w.ledger);
  const cash = clubs[clubId]!.cash;
  w.clubId = clubId;
  w.hired = w.season.season;
  // The rivals' cash moves at each season's turn (clubs.ts `settleSeason`): this is the club's
  // cash at the last turn, or the pack's in the first season.
  w.ledger = createLedger(w.day, [
    {
      key: `opening-cash:${clubId}:${w.day}`,
      kind: 'opening',
      ref: 'pack',
      amount: cash,
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
  // The boys of the club left behind go back to its academy; those of the new club are the
  // person's academy now (bases.ts).
  if (boysLeft.length)
    applyMoves(
      w,
      Object.fromEntries(
        boysLeft.map((p) => [
          p.id,
          {
            clubId: `${ACADEMY}${p.clubId}`,
            wage: p.contract?.wage ?? 0,
            until: p.contract?.until ?? '',
          },
        ]),
      ),
    );
  const boys = baseOf(w, clubId);
  if (boys.length) {
    bringUp(w, boys);
    w.academy = boys.map((p) => p.id);
  }
  // A season taken over half-way is not judged by what the last coach left: the goal is the
  // squad's place or the place the club is in today, whichever asks less.
  w.board = {
    confidence: 60,
    goal: Math.min(divisionTable(w).rows.length, Math.max(goalFor(w), positionOf(w))),
  };
  note(w, { day: w.day, kind: 'hired', club: clubId });
}
