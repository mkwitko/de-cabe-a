/**
 * The career calendar (MC-084, 01 §4, ADR-020): the world moves day by day until the next day
 * the person has to decide something (for now, their club's match). Every other match is a
 * level 3 result from the season seed, so the same pack, seed and day always rebuild the same
 * world: the server keeps only the day, the browser replays up to it.
 */
import { standings, type Row } from '../competition/league';
import { matchesOn, nextDay, record, seedOf, type SeasonState } from '../competition/season';
import { advanceLedger, type Ledger } from '../finance/ledger';
import { clubStrength, quickResult } from '../match/quick';
import type { Outcome } from '../competition/season';
import type { Pack } from '../pack/schema';
import { nationalDivisions, startCareer } from './start';

export interface CareerWorld {
  pack: Pack;
  seed: number;
  clubId: string;
  season: SeasonState;
  ledger: Ledger;
  /** Last day whose matches are all played (0 before the first). */
  day: number;
  strength: Map<string, number>;
}

export type Decision =
  | {
      kind: 'match';
      day: number;
      matchId: string;
      competitionId: string;
      home: string;
      away: string;
    }
  | { kind: 'seasonOver' };

function playDay(w: CareerWorld, day: number): Map<string, Outcome> {
  const out = new Map<string, Outcome>();
  for (const id of matchesOn(w.season, day)) {
    const m = w.season.meta.get(id)!;
    const o = quickResult(
      seedOf(w.seed, id),
      w.strength.get(m.home) ?? 50,
      w.strength.get(m.away) ?? 50,
    );
    record(w.season, id, o);
    out.set(id, o);
  }
  w.day = day;
  advanceLedger(w.ledger, day);
  return out;
}

const clubPlays = (w: CareerWorld, day: number) =>
  matchesOn(w.season, day).find((id) => {
    const m = w.season.meta.get(id)!;
    return m.home === w.clubId || m.away === w.clubId;
  });

/** The world as it stands after `day`: the start, then every match day up to it. */
export function openCareer(pack: Pack, seed: number, clubId: string, day = 0): CareerWorld {
  const start = startCareer(pack, seed, clubId);
  const w: CareerWorld = { pack, seed, ...start, day: 0, strength: clubStrength(pack) };
  for (let d = nextDay(w.season); d !== null && d <= day; d = nextDay(w.season)) playDay(w, d);
  w.day = day;
  return w;
}

/**
 * Plays every day before the next decision and stops there, without playing that day.
 * Returns the decision; `w.day` is the last day played.
 */
export function nextDecision(w: CareerWorld): Decision {
  for (let d = nextDay(w.season); d !== null; d = nextDay(w.season)) {
    const id = clubPlays(w, d);
    if (id) {
      const m = w.season.meta.get(id)!;
      return {
        kind: 'match',
        day: d,
        matchId: id,
        competitionId: m.competitionId,
        home: m.home,
        away: m.away,
      };
    }
    playDay(w, d);
  }
  return { kind: 'seasonOver' };
}

/** Plays the day of the person's next match (their match and everyone else's). */
export function playDecision(w: CareerWorld, d: Extract<Decision, { kind: 'match' }>): Outcome {
  if (nextDay(w.season) !== d.day) throw new Error('career: that match is not next');
  return playDay(w, d.day).get(d.matchId)!;
}

/** The person's division table as it stands; in a group phase, their group. */
export function divisionTable(w: CareerWorld): { name: string; rows: Row[] } {
  const div = nationalDivisions(w.pack).find((x) => w.season.members[x.id]?.includes(w.clubId));
  const comp = div && w.season.competitions.find((c) => c.id === div.id);
  if (!div || !comp) return { name: '', rows: [] };
  const first = comp.phases[0]!;
  const done = w.season.results[comp.id]?.[first.id];
  const finished = done?.tables.find((t) => t.some((r) => r.clubId === w.clubId));
  if (finished) return { name: div.name, rows: finished };
  const run = w.season.running.get(`${comp.id}/${first.id}`);
  const group =
    (run?.kind === 'table' ? run.groups.find((g) => g.includes(w.clubId)) : undefined) ??
    w.season.members[div.id]!;
  const inGroup = new Set(group);
  // Display order only; phase outcomes use the competition's own tie-breakers.
  const rows = standings(
    group,
    (w.season.played.get(div.id) ?? []).filter((g) => inGroup.has(g.home) && inGroup.has(g.away)),
    { points: { win: 3, draw: 1, loss: 0 }, tieBreakers: ['goalDifference', 'goalsFor'], seed: 0 },
  );
  return { name: div.name, rows };
}
