/**
 * The season's goals and assists of every player in the national divisions (artilharia): who
 * scored is drawn for the matches nobody watched (match/scorers.ts) and read off the engine for
 * the ones the person watched. Kept as `[goals, assists]` by player id, only for those who
 * have one; league matches only (cups are not counted). Starts over each season.
 */
import { attribute, type Goal } from '../match/scorers';
import type { CareerWorld } from './advance';
import { squadPlayers } from './squad';
import { nationalDivisions } from './start';

export type Scored = Record<string, [number, number]>;

/** Adds one side's goals to the season's tally (in place: this runs for every match). */
export function credit(w: CareerWorld, goals: readonly Goal[]): void {
  if (!goals.length) return;
  const s = (w.scored ??= {});
  for (const g of goals) {
    (s[g.scorer] ??= [0, 0])[0]++;
    if (g.assist) (s[g.assist] ??= [0, 0])[1]++;
  }
}

/** Goals of a side in a match of the league: the engine's when watched, else drawn. */
export function sideGoals(
  w: CareerWorld,
  seed: number,
  clubId: string,
  n: number,
  pitch: readonly string[],
  given?: readonly Goal[],
): Goal[] {
  if (given) return [...given];
  const on = new Set(pitch);
  return attribute(
    seed,
    n,
    squadPlayers({ pack: w.pack, clubId }).filter((p) => on.has(p.id)),
  );
}

export interface Scorer {
  playerId: string;
  goals: number;
  assists: number;
}

/** The best by goals (then assists, then id), among `clubIds` when given (current club). */
export function topScorers(
  w: CareerWorld,
  by: 'goals' | 'assists',
  n: number,
  clubIds?: ReadonlySet<string>,
): Scorer[] {
  const clubOf = clubIds && new Map(w.pack.players.map((p) => [p.id, p.clubId]));
  const key = (x: Scorer) => (by === 'goals' ? [x.goals, x.assists] : [x.assists, x.goals]);
  return Object.entries(w.scored ?? {})
    .filter(([id]) => !clubOf || clubIds!.has(clubOf.get(id) ?? ''))
    .map(([playerId, [goals, assists]]) => ({ playerId, goals, assists }))
    .sort(
      (a, b) =>
        key(b)[0]! - key(a)[0]! || key(b)[1]! - key(a)[1]! || (a.playerId < b.playerId ? -1 : 1),
    )
    .slice(0, n);
}

/** Ids of the national divisions: the competitions whose goals are counted. */
export const leagueIds = (w: CareerWorld) => new Set(nationalDivisions(w.pack).map((d) => d.id));
