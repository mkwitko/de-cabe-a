/**
 * The career snapshot (ADR-020): the world's state written out, so what was played is never
 * computed again. A change to the rules or to the pack after a snapshot cannot rewrite past
 * results; the browser replays only the days after the last snapshot, and only with the rules
 * version that wrote it (CAREER_RULES_VERSION).
 */
import { ABROAD } from '../market/abroad';
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
import { withClubs, type ClubState } from './clubs';
import { arrivalsOf, rebuildPack } from './years';
import type { Note } from './inbox';

/**
 * Bumped whenever a change would give another result for the same world, seed and day (result
 * model, calendar, tie-breakers…). A snapshot from an older version is loaded, never replayed.
 */
export const CAREER_RULES_VERSION = 51;

interface Saved {
  v: number;
  /** The club the person coaches now, when it is no longer the one the career opened at. */
  clubId?: string;
  day: number;
  season: unknown;
  ledger: { today: number; entries: LedgerEntry[] };
  /** The person's eleven; absent while the coach picks (squad.ts). */
  lineup?: Lineup;
  /** Freshness and drill (training.ts). */
  training?: Training;
  /** Transfers so far (market.ts); the pack is rebuilt from them on load. */
  /** The moves in force, packed (`packMoves`); a plain map in snapshots of older versions. */
  moves?: PackedMoves | Moves;
  board?: Board;
  hired?: number;
  inbox?: Note[];
  books?: CareerWorld['books'];
  deals?: CareerWorld['deals'];
  talks?: CareerWorld['talks'];
  bids?: CareerWorld['bids'];
  listed?: CareerWorld['listed'];
  cold?: CareerWorld['cold'];
  scouting?: CareerWorld['scouting'];
  deadline?: CareerWorld['deadline'];
  agents?: CareerWorld['agents'];
  idle?: CareerWorld['idle'];
  loans?: CareerWorld['loans'];
  forLoan?: CareerWorld['forLoan'];
  log?: CareerWorld['log'];
  injuries?: CareerWorld['injuries'];
  cards?: CareerWorld['cards'];
  arrears?: CareerWorld['arrears'];
  benches?: CareerWorld['benches'];
  vacancies?: CareerWorld['vacancies'];
  sacked?: CareerWorld['sacked'];
  academy?: CareerWorld['academy'];
  image?: CareerWorld['image'];
  fairplay?: CareerWorld['fairplay'];
  /** Every club's cash, directors and structure (clubs.ts). */
  clubs?: Record<string, ClubState>;
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

/**
 * The moves in force as rows of numbers: a career ends up with one for nearly every player, and
 * as objects they would be most of the snapshot. `[player, club, wage, until, release, season,
 * joined]`, with the club as its place in the pack's list (-1: none), years as numbers and -1
 * for what is absent.
 */
interface PackedMoves {
  rows: [string, number, number, number, number, number, number][];
}

function packMoves(pack: Pack, moves: Moves): PackedMoves {
  const place = new Map(pack.clubs.map((c, i) => [c.id, i]));
  return {
    rows: Object.entries(moves).map(([id, m]) => [
      id,
      m.clubId === null ? -1 : m.clubId === ABROAD ? -2 : (place.get(m.clubId) ?? -1),
      m.wage,
      m.until ? Number(m.until.slice(0, 4)) : -1,
      m.release ?? -1,
      m.season ?? -1,
      m.joined ?? -1,
    ]),
  };
}

function unpackMoves(pack: Pack, saved: PackedMoves | Moves | undefined): Moves {
  if (!saved) return {};
  if (!('rows' in saved) || !Array.isArray(saved.rows)) return saved as Moves;
  const moves: Moves = {};
  for (const [id, club, wage, until, release, season, joined] of saved.rows)
    moves[id] = {
      clubId: club === -2 ? ABROAD : club < 0 ? null : pack.clubs[club]!.id,
      wage,
      until: until < 0 ? '' : `${until}-12-31`,
      ...(release >= 0 && { release }),
      ...(season >= 0 && { season }),
      ...(joined >= 0 && { joined }),
    };
  return moves;
}

export function saveCareer(w: CareerWorld): string {
  const { byClub: _byClub, ...calendar } = w.season.calendar;
  const saved: Saved = {
    v: CAREER_RULES_VERSION,
    clubId: w.clubId,
    day: w.day,
    season: { ...w.season, calendar },
    ledger: { today: w.ledger.today, entries: w.ledger.entries },
    ...(w.lineup && { lineup: w.lineup }),
    ...(w.training && { training: w.training }),
    ...(w.moves && { moves: packMoves(w.pack, w.moves) }),
    ...(w.board && { board: w.board }),
    ...(w.hired !== undefined && { hired: w.hired }),
    ...(w.inbox && { inbox: w.inbox }),
    ...(w.books && { books: w.books }),
    ...(w.deals && { deals: w.deals }),
    ...(w.talks && { talks: w.talks }),
    ...(w.bids && { bids: w.bids }),
    ...(w.listed && { listed: w.listed }),
    ...(w.cold && { cold: w.cold }),
    ...(w.scouting && { scouting: w.scouting }),
    ...(w.deadline !== undefined && { deadline: w.deadline }),
    ...(w.agents && { agents: w.agents }),
    ...(w.idle && { idle: w.idle }),
    ...(w.loans && { loans: w.loans }),
    ...(w.forLoan && { forLoan: w.forLoan }),
    ...(w.log && { log: w.log }),
    ...(w.injuries && { injuries: w.injuries }),
    ...(w.cards && { cards: w.cards }),
    ...(w.arrears && { arrears: w.arrears }),
    ...(w.benches && { benches: w.benches }),
    ...(w.vacancies && { vacancies: w.vacancies }),
    ...(w.sacked && { sacked: w.sacked }),
    ...(w.academy && { academy: w.academy }),
    ...(w.image && { image: w.image }),
    ...(w.fairplay && { fairplay: w.fairplay }),
    ...(w.clubs && { clubs: w.clubs }),
    ...(w.starts && { starts: w.starts }),
    ...(w.played !== undefined && { played: w.played }),
  };
  return JSON.stringify(saved, replacer);
}

export function loadCareer(base: Pack, seed: number, clubId: string, json: string): CareerWorld {
  const saved = JSON.parse(json, reviver) as Saved;
  // The career's own pack object: the years replayed from the log, then this season's moves.
  const moves = unpackMoves(base, saved.moves);
  // A log from before the yearly growth was kept by character cannot be replayed: skipped.
  const log = (saved.log ?? []).filter((l) => typeof l.growth === 'string');
  const opening = log[0]?.season ?? (saved.season as SeasonState).season;
  const pack = withClubs(rebuildPack(base, seed, log, moves, opening), saved.clubs, base);
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
  setJudgementClock(pack, seed, season.season, arrivalsOf(moves));
  return {
    pack,
    origin: base,
    seed,
    clubId: saved.clubId ?? clubId,
    season,
    ledger: createLedger(saved.ledger.today, saved.ledger.entries),
    day: saved.day,
    ...clubLevels(pack, season.season),
    ...(saved.lineup && { lineup: saved.lineup }),
    ...(saved.training && { training: saved.training }),
    ...(saved.moves && { moves }),
    ...(saved.board && { board: saved.board }),
    ...(saved.hired !== undefined && { hired: saved.hired }),
    ...(saved.inbox && { inbox: saved.inbox }),
    ...(saved.books && { books: saved.books }),
    ...(saved.deals && { deals: saved.deals }),
    ...(saved.talks && { talks: saved.talks }),
    ...(saved.bids && { bids: saved.bids }),
    ...(saved.listed && { listed: saved.listed }),
    ...(saved.cold && { cold: saved.cold }),
    ...(saved.scouting && { scouting: saved.scouting }),
    ...(saved.deadline !== undefined && { deadline: saved.deadline }),
    ...(saved.agents && { agents: saved.agents }),
    ...(saved.idle && { idle: saved.idle }),
    ...(saved.loans && { loans: saved.loans }),
    ...(saved.forLoan && { forLoan: saved.forLoan }),
    ...(saved.log && { log }),
    ...(saved.injuries && { injuries: saved.injuries }),
    ...(saved.cards && { cards: saved.cards }),
    ...(saved.arrears && { arrears: saved.arrears }),
    ...(saved.benches && { benches: saved.benches }),
    ...(saved.vacancies && { vacancies: saved.vacancies }),
    ...(saved.sacked && { sacked: saved.sacked }),
    ...(saved.academy && { academy: saved.academy }),
    ...(saved.image && { image: saved.image }),
    ...(saved.fairplay && { fairplay: saved.fairplay }),
    ...(saved.clubs && { clubs: saved.clubs }),
    ...(saved.starts && { starts: saved.starts }),
    ...(saved.played !== undefined && { played: saved.played }),
  };
}
