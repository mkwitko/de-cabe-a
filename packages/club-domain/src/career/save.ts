/**
 * The career snapshot (ADR-020): the world's state written out, so what was played is never
 * computed again. A change to the rules or to the pack after a snapshot cannot rewrite past
 * results; the browser replays only the days after the last snapshot, and only with the rules
 * version that wrote it (CAREER_RULES_VERSION).
 */
import { emptyCalendar, type Scheduled } from '../competition/calendar';
import type { SeasonState } from '../competition/season';
import { createLedger, type LedgerEntry } from '../finance/ledger';
import type { Pack } from '../pack/schema';
import type { CareerWorld } from './advance';
import type { Lineup } from './squad';
import { clubLevels, type Training } from './training';
import type { Moves } from './market';
import type { Board } from './board';
import { setJudgementClock } from '../market/judgement';
import { arrivalsOf, rebuildPack } from './years';
import type { Note } from './inbox';

/**
 * Bumped whenever a change would give another result for the same world, seed and day (result
 * model, calendar, tie-breakers…). A snapshot from an older version is loaded, never replayed.
 */
export const CAREER_RULES_VERSION = 6;

interface Saved {
  v: number;
  day: number;
  season: unknown;
  ledger: { today: number; entries: LedgerEntry[] };
  /** The person's eleven; absent while the coach picks (squad.ts). */
  lineup?: Lineup;
  /** Freshness and drill (training.ts). */
  training?: Training;
  /** Transfers so far (market.ts); the pack is rebuilt from them on load. */
  moves?: Moves;
  board?: Board;
  inbox?: Note[];
  books?: CareerWorld['books'];
  deals?: CareerWorld['deals'];
  talks?: CareerWorld['talks'];
  bids?: CareerWorld['bids'];
  listed?: CareerWorld['listed'];
  cold?: CareerWorld['cold'];
  idle?: CareerWorld['idle'];
  loans?: CareerWorld['loans'];
  forLoan?: CareerWorld['forLoan'];
  log?: CareerWorld['log'];
  injuries?: CareerWorld['injuries'];
  starts?: CareerWorld['starts'];
  played?: CareerWorld['played'];
}

// Maps and Sets as tagged lists; the calendar's index by club is rebuilt on load.
const replacer = (_k: string, v: unknown) =>
  v instanceof Map ? { $map: [...v] } : v instanceof Set ? { $set: [...v] } : v;
const reviver = (_k: string, v: unknown) => {
  if (v && typeof v === 'object' && '$map' in v)
    return new Map((v as { $map: [unknown, unknown][] }).$map);
  if (v && typeof v === 'object' && '$set' in v) return new Set((v as { $set: unknown[] }).$set);
  return v;
};

export function saveCareer(w: CareerWorld): string {
  const { byClub: _byClub, ...calendar } = w.season.calendar;
  const saved: Saved = {
    v: CAREER_RULES_VERSION,
    day: w.day,
    season: { ...w.season, calendar },
    ledger: { today: w.ledger.today, entries: w.ledger.entries },
    ...(w.lineup && { lineup: w.lineup }),
    ...(w.training && { training: w.training }),
    ...(w.moves && { moves: w.moves }),
    ...(w.board && { board: w.board }),
    ...(w.inbox && { inbox: w.inbox }),
    ...(w.books && { books: w.books }),
    ...(w.deals && { deals: w.deals }),
    ...(w.talks && { talks: w.talks }),
    ...(w.bids && { bids: w.bids }),
    ...(w.listed && { listed: w.listed }),
    ...(w.cold && { cold: w.cold }),
    ...(w.idle && { idle: w.idle }),
    ...(w.loans && { loans: w.loans }),
    ...(w.forLoan && { forLoan: w.forLoan }),
    ...(w.log && { log: w.log }),
    ...(w.injuries && { injuries: w.injuries }),
    ...(w.starts && { starts: w.starts }),
    ...(w.played !== undefined && { played: w.played }),
  };
  return JSON.stringify(saved, replacer);
}

export function loadCareer(base: Pack, seed: number, clubId: string, json: string): CareerWorld {
  const saved = JSON.parse(json, reviver) as Saved;
  // The career's own pack object: the years replayed from the log, then this season's moves.
  const pack = rebuildPack(base, seed, saved.log ?? [], saved.moves ?? {});
  if (saved.v > CAREER_RULES_VERSION) throw new Error('career: saved by a newer version');
  const season = saved.season as SeasonState;
  // The same Scheduled objects in both indexes, in the order they were placed.
  const calendar = { ...emptyCalendar(), ...season.calendar };
  calendar.byClub = new Map();
  for (const m of calendar.matches.values() as Iterable<Scheduled>)
    for (const club of [m.home, m.away]) {
      let set = calendar.byClub.get(club);
      if (!set) calendar.byClub.set(club, (set = new Set()));
      set.add(m);
    }
  season.calendar = calendar;
  // Opinions are this career's: its seed, its season, and when each moved player arrived.
  setJudgementClock(pack, seed, season.season, arrivalsOf(saved.log ?? [], saved.moves ?? {}));
  return {
    pack,
    origin: base,
    seed,
    clubId,
    season,
    ledger: createLedger(saved.ledger.today, saved.ledger.entries),
    day: saved.day,
    ...clubLevels(pack),
    ...(saved.lineup && { lineup: saved.lineup }),
    ...(saved.training && { training: saved.training }),
    ...(saved.moves && { moves: saved.moves }),
    ...(saved.board && { board: saved.board }),
    ...(saved.inbox && { inbox: saved.inbox }),
    ...(saved.books && { books: saved.books }),
    ...(saved.deals && { deals: saved.deals }),
    ...(saved.talks && { talks: saved.talks }),
    ...(saved.bids && { bids: saved.bids }),
    ...(saved.listed && { listed: saved.listed }),
    ...(saved.cold && { cold: saved.cold }),
    ...(saved.idle && { idle: saved.idle }),
    ...(saved.loans && { loans: saved.loans }),
    ...(saved.forLoan && { forLoan: saved.forLoan }),
    ...(saved.log && { log: saved.log }),
    ...(saved.injuries && { injuries: saved.injuries }),
    ...(saved.starts && { starts: saved.starts }),
    ...(saved.played !== undefined && { played: saved.played }),
  };
}
