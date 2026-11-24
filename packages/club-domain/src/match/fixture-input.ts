/**
 * From a season fixture to the engine's contract and back (MC-179). The
 * engine is a black box: `MatchInput` in, `MatchResult` out. Every club, user
 * or not, gets the same treatment (ADR-013 item 7). Player state is not
 * carried between matches yet (no injuries, suspensions or fatigue).
 */
import {
  MATCH_ENGINE_VERSION,
  defaultPlan,
  fork,
  lineOf,
  rngFrom,
  shootout,
  type MatchInput,
  type MatchResult,
  type RoleId,
  type Taker,
} from '@decabeca/match-engine';
import { FOREIGN_CLUBS } from '../competition/conmebol-data';
import { deciderRules } from '../competition/knockout';
import { seedOf, type Outcome, type SeasonState } from '../competition/season';
import { crowdShare, isDerby, neutralVenue } from './stadium';
import { DERBY_CARDS, refereeOf } from './referee';
import type { Pack } from '../pack/schema';
import { teamForMatch } from './lineup';

/** PARÂMETRO until the tactics tasks: each club keeps one of the three presets, by id. */
const PRESETS = ['4-3-3', '4-4-2', '4-2-3-1'] as const;
export const formationOf = (clubId: string) =>
  PRESETS[[...clubId].reduce((s, ch) => s + ch.charCodeAt(0), 0) % PRESETS.length]!;

export function matchInputFor(pack: Pack, s: SeasonState, id: string): MatchInput {
  const m = s.calendar.matches.get(id);
  if (!m) throw new Error(`unknown match ${id}`);
  const c = s.competitions.find((x) => x.id === m.competitionId)!;
  const p = c.phases.find((x) => x.id === s.meta.get(id)!.phaseId)!;
  const home = pack.clubs.find((x) => x.id === m.home);
  const city = home && pack.cities.find((x) => x.id === home.cityId);
  // A foreign club of the CONMEBOL cups has no club in the pack: its city from conmebol-data.
  const abroad = home ? undefined : FOREIGN_CLUBS.find((x) => x.id === m.home);
  const single = (p.kind === 'mata-mata' || p.kind === 'final') && p.legs === 1;
  return {
    engineVersion: MATCH_ENGINE_VERSION,
    seed: seedOf(s.seed, `match:${id}`),
    teams: [m.home, m.away].map((k) =>
      teamForMatch(pack, k, defaultPlan(formationOf(k))),
    ) as MatchInput['teams'],
    conditions: {
      crowd: crowdShare(pack, s, id),
      // Neutral ground (Supercopa, Intercontinental) at sea level, not the listed host's city.
      altitudeM: neutralVenue(id) ? 0 : (city?.altitudeM ?? abroad?.altitudeM ?? 0),
      pitch: home?.stadium.pitch ?? 'good',
      weather: 'clear',
      // The engine is calibrated at 0.5: the pool's average referee sits there (referee.ts).
      // A derby is hotter: the referee reaches for his pocket more (DERBY_CARDS).
      refereeStrictness: Math.min(
        1,
        (refereeOf(s, id).strictness * 3 * (isDerby(pack, m.home, m.away) ? DERBY_CARDS : 100)) /
          20_000,
      ),
    },
    rules: {
      substitutions: c.matchRules.subs,
      substitutionWindows: c.matchRules.subWindows,
      videoReferee: c.matchRules.videoReferee,
      ...(single ? deciderRules(1, p.tieBreakers) : secondLeg(s, id, p.tieBreakers)),
    },
  };
}

/**
 * A two-leg tie's second leg: the engine is told the goals each side carries from the first, and
 * plays extra time (the Recopa) and the shoot-out when the regulation has them and the aggregate
 * is level.
 */
function secondLeg(
  s: SeasonState,
  id: string,
  breakers: readonly string[],
): { extraTime: boolean; penalties: boolean; carried?: [number, number] } {
  const ko = s.meta.get(id)?.ko;
  const firstId = id.replace(/l\d+$/, 'l0');
  const first = ko && ko.leg > 0 ? s.outcomes.get(firstId) : undefined;
  const m = s.meta.get(firstId);
  if (!first || !m) return { extraTime: false, penalties: false };
  const of = (club: string) => (m.home === club ? first.goals[0] : first.goals[1]);
  const here = s.meta.get(id)!;
  return {
    extraTime: breakers.includes('extraTime'),
    penalties: breakers.includes('penalties'),
    carried: [of(here.home), of(here.away)],
  };
}

/**
 * The shoot-out of a quick result that leaves a tie level, played by the engine's own rule
 * (rules/shootout.ts) between the two elevens: null when the match decides nothing on penalties.
 * `packOf` gives a pack holding both squads (career/foreign-squad.ts `matchPack` for a foreign
 * club); it is read only when a shoot-out is played.
 */
export function quickShootout(
  packOf: () => Pack,
  s: SeasonState,
  id: string,
  goals: [number, number],
): [number, number] | null {
  const meta = s.meta.get(id);
  if (!meta?.ko) return null;
  const p = s.competitions
    .find((c) => c.id === meta.competitionId)
    ?.phases.find((x) => x.id === meta.phaseId);
  if (!p || (p.kind !== 'mata-mata' && p.kind !== 'final')) return null;
  if (!(p.tieBreakers as readonly string[]).includes('penalties')) return null;
  let carried: [number, number] = [0, 0];
  if (p.legs === 2) {
    const r = secondLeg(s, id, p.tieBreakers);
    if (!r.carried) return null;
    carried = r.carried;
  }
  if (goals[0] + carried[0] !== goals[1] + carried[1]) return null;
  const pack = packOf();
  const side = (club: string): Taker[] => {
    const t = teamForMatch(pack, club, defaultPlan(formationOf(club)));
    return t.players.slice(0, 11).map((pl, i) => ({
      id: pl.id,
      attrs: pl.attributes,
      nerve: pl.hidden.bigMatches,
      keeper: lineOf(t.plan.roles[i] as RoleId) === 'gk',
    }));
  };
  const sides: [Taker[], Taker[]] = [side(meta.home), side(meta.away)];
  const keeper = (x: Taker[]) => (x.find((k) => k.keeper) ?? x[0]!).attrs;
  return shootout(
    sides,
    [keeper(sides[0]), keeper(sides[1])],
    fork(rngFrom(seedOf(s.seed, `match:${id}`)), 'shootout'),
  ).score;
}

export const outcomeOf = (r: MatchResult): Outcome => ({
  goals: [r.score[0], r.score[1]],
  shootout: r.shootout,
  cards: [
    [r.stats[0].yellowCards, r.stats[0].redCards],
    [r.stats[1].yellowCards, r.stats[1].redCards],
  ],
});
