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
import { withMoves, type Moves } from './market';

/**
 * Bumped whenever a change would give another result for the same world, seed and day (result
 * model, calendar, tie-breakers…). A snapshot from an older version is loaded, never replayed.
 */
export const CAREER_RULES_VERSION = 3;

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
  };
  return JSON.stringify(saved, replacer);
}

export function loadCareer(base: Pack, seed: number, clubId: string, json: string): CareerWorld {
  const saved = JSON.parse(json, reviver) as Saved;
  const pack = withMoves(base, saved.moves ?? {});
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
  return {
    pack,
    seed,
    clubId,
    season,
    ledger: createLedger(saved.ledger.today, saved.ledger.entries),
    day: saved.day,
    ...clubLevels(pack),
    ...(saved.lineup && { lineup: saved.lineup }),
    ...(saved.training && { training: saved.training }),
    ...(saved.moves && { moves: saved.moves }),
  };
}
