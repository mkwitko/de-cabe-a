/**
 * The season's story: a review at the season's end (before the turn) and the club history that
 * accumulates in the career, one entry per season, whichever club the person coached.
 */
import { finishSeason, isOver } from '../competition/season';
import { regulationsFor } from '../competition/outcomes';
import { boardAfterSeason, boardOf, positionOf, type BoardReason } from './board';
import { topScorers } from './scoring';
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
  /** The club's top scorer and assister of the league season (scoring.ts); absent before. */
  scorer?: { name: string; goals: number } | null;
  assister?: { name: string; assists: number } | null;
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
  /** The division's top scorers (artilharia), best first. */
  artilharia: { name: string; clubName: string; goals: number; mine: boolean }[];
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
  const mineIds = new Set(w.pack.players.filter((p) => p.clubId === w.clubId).map((p) => p.id));
  const named = new Map(w.pack.players.map((p) => [p.id, p]));
  const nameOf = (id: string) => named.get(id)?.knownAs ?? named.get(id)?.name ?? '';
  const first = (by: 'goals' | 'assists') => topScorers(w, by, 1, new Set([w.clubId]))[0];
  const sc = first('goals');
  const as = first('assists');
  const members = new Set(div ? (w.season.members[div.id] ?? []) : []);
  const artilharia = topScorers(w, 'goals', 5, members).map((x) => ({
    name: nameOf(x.playerId),
    clubName: clubName(named.get(x.playerId)?.clubId ?? ''),
    goals: x.goals,
    mine: mineIds.has(x.playerId),
  }));
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
    artilharia,
    scorer: sc ? { name: nameOf(sc.playerId), goals: sc.goals } : null,
    assister: as && as.assists > 0 ? { name: nameOf(as.playerId), assists: as.assists } : null,
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
  ...(r.scorer !== undefined && { scorer: r.scorer }),
  ...(r.assister !== undefined && { assister: r.assister }),
});
