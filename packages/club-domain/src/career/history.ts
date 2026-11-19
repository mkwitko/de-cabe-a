/**
 * The season's story: a review at the season's end (before the turn) and the club history that
 * accumulates in the career, one entry per season, whichever club the person coached.
 */
import { finishSeason, isOver } from '../competition/season';
import { regulationsFor } from '../competition/outcomes';
import { boardAfterSeason, boardOf, positionOf, type BoardReason } from './board';
import { divisionTable, divisionTableOf, type CareerWorld } from './advance';

/** What the career keeps of a season. */
export interface HistoryEntry {
  season: number;
  clubId: string;
  division: string;
  position: number;
  goal: number;
  met: boolean;
  fired?: true;
  move: 'promotion' | 'relegation' | 'stay';
  /** The person's club won its division. */
  champion: boolean;
  /** Other competitions the club won (cups), by name. */
  cups: string[];
  /** The club's most-used player (matches started): goals per player are not recorded. */
  top: { name: string; starts: number } | null;
}

export interface Match {
  opponent: string;
  /** Goals from the club's side. */
  goals: [number, number];
}

/** The review the season-end screen shows. */
export interface SeasonReview extends HistoryEntry {
  places: number;
  /** Division champion's name. */
  championName: string;
  confidence: { from: number; to: number };
  reasons: BoardReason[];
  record: { won: number; drawn: number; lost: number; for: number; against: number };
  /** Most-used players, by matches started. */
  used: { name: string; starts: number }[];
  biggestWin: Match | null;
  worstDefeat: Match | null;
}

/** Reads the season just ended; changes nothing. */
export function seasonReview(w: CareerWorld): SeasonReview | null {
  if (!isOver(w.season)) return null;
  const b = boardOf(w);
  const after = boardAfterSeason(w);
  const table = divisionTable(w);
  const position = positionOf(w);
  const div = w.season.competitions.find((c) => c.name === table.name);
  const t = finishSeason(w.season, regulationsFor(w.pack.competitions, w.season.season + 1));
  const clubName = (id: string) => w.pack.clubs.find((c) => c.id === id)?.shortName ?? '';
  const record = { won: 0, drawn: 0, lost: 0, for: 0, against: 0 };
  let biggestWin: Match | null = null;
  let worstDefeat: Match | null = null;
  const margin = (m: Match | null) => (m ? Math.abs(m.goals[0] - m.goals[1]) : 0);
  for (const games of w.season.played.values())
    for (const g of games) {
      const home = g.home === w.clubId;
      if (!home && g.away !== w.clubId) continue;
      const goals: [number, number] = home ? [g.goals[0], g.goals[1]] : [g.goals[1], g.goals[0]];
      const m = { opponent: clubName(home ? g.away : g.home), goals };
      record.for += goals[0];
      record.against += goals[1];
      if (goals[0] > goals[1]) {
        record.won++;
        if (goals[0] - goals[1] > margin(biggestWin)) biggestWin = m;
      } else if (goals[0] < goals[1]) {
        record.lost++;
        if (goals[1] - goals[0] > margin(worstDefeat)) worstDefeat = m;
      } else record.drawn++;
    }
  const names = new Map(w.pack.players.map((p) => [p.id, p.name]));
  const used = Object.entries(w.starts ?? {})
    .filter(([id]) => names.has(id))
    .sort((a, c) => c[1] - a[1] || a[0].localeCompare(c[0]))
    .slice(0, 3)
    .map(([id, starts]) => ({ name: names.get(id)!, starts }));
  const won = t.titles.filter((x) => x.clubId === w.clubId).map((x) => x.competitionId);
  return {
    season: w.season.season,
    clubId: w.clubId,
    division: table.name,
    position,
    places: divisionTableOf(w, w.clubId).rows.length,
    goal: b.goal,
    met: !b.fired && position <= b.goal,
    ...(b.fired && { fired: true as const }),
    move: t.moves.find((m) => m.clubId === w.clubId)?.kind ?? 'stay',
    champion: !!div && won.includes(div.id),
    championName: clubName(t.titles.find((x) => x.competitionId === div?.id)?.clubId ?? ''),
    cups: won
      .filter((id) => id !== div?.id)
      .map((id) => w.season.competitions.find((c) => c.id === id)?.name ?? '')
      .filter(Boolean),
    top: used[0] ?? null,
    confidence: { from: b.confidence, to: after.confidence },
    reasons: b.fired ? [] : (after.last ?? []),
    record,
    used,
    biggestWin,
    worstDefeat,
  };
}

/** The review's part the career keeps. */
export const entryOf = (r: SeasonReview): HistoryEntry => ({
  season: r.season,
  clubId: r.clubId,
  division: r.division,
  position: r.position,
  goal: r.goal,
  met: r.met,
  ...(r.fired && { fired: true as const }),
  move: r.move,
  champion: r.champion,
  cups: r.cups,
  top: r.top,
});
