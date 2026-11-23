/**
 * Regional cups (Copa do Nordeste, Copa Verde in its Norte and Centro-Oeste halves) and the
 * Supercopa do Brasil as ordinary competitions. Formats, dates, money and sources:
 * `regionais-data.ts`. Participants come from the pack's clubs by state (the city's `state`) and
 * from last season's state championships; nothing is added to the pack. Calendar: from the first
 * Wednesday on or after 24 March (25 Mar 2026), ten weeks; the Supercopa on the first Sunday of
 * February. Below the national series in priority like the state championships; the Supercopa
 * above everything.
 */
import type { Pack } from '../pack/schema';
import { dayOf, isoOf, weekday } from './calendar';
import { gruposPhase, knockoutPhase, regulation } from '../generate/competitions';
import type { Results } from './outcomes';
import type { Competition, Phase } from './schema';
import {
  CENTRO_OESTE_BERTHS,
  CENTRO_OESTE_ID,
  NORDESTE_BERTHS,
  NORDESTE_ID,
  NORTE_BERTHS,
  NORTE_ID,
  PRIZES,
  REGIONAL_IDS,
  SUPERCOPA_ID,
  VERDE_ID,
} from './regionais-data';
import { COPA_ID } from './copa';
import { isEstadual } from './estaduais';

export const isRegional = (c: { id: string }) => (REGIONAL_IDS as readonly string[]).includes(c.id);
/** Matches that weigh half on a board (the state and regional cups). */
export const isMinorCup = (c: { id: string }) => isEstadual(c) || isRegional(c);

/** Clubs of the first phase and the knockout of a regional cup, by its size. */
const MIN_CLUBS = 8;

/** The cups' first Wednesday: on or after 24 March (25 Mar 2026). */
export function regionalStart(season: number): number {
  const d = dayOf(`${season}-03-24`);
  return d + ((3 - weekday(d) + 7) % 7);
}

/** Season day `from..to` after the start, on `weekdays`. */
const win = (w0: number, from: number, to: number, weekdays: number[]) => ({
  start: isoOf(w0 + from),
  end: isoOf(w0 + to),
  weekdays,
});

/** Champion first, then the runner-up of a finished final (last season's), or nothing. */
export const finalists = (previous: Results, competitionId: string): string[] =>
  previous[competitionId]?.final?.tables[0]?.map((r) => r.clubId) ?? [];

interface Clubs {
  id: string;
  reputation: number;
}

/**
 * The clubs of a cup: in each state its berths, the last season's champion and runner-up first,
 * then the best by reputation; short states and short fields are filled from the whole region
 * by reputation. Returned best first.
 */
function field(
  byState: Map<string, Clubs[]>,
  berths: Record<string, number>,
  previous: Results,
): string[] {
  const rep = (a: Clubs, b: Clubs) => b.reputation - a.reputation || (a.id < b.id ? -1 : 1);
  const chosen: Clubs[] = [];
  const rest: Clubs[] = [];
  for (const [uf, n] of Object.entries(berths)) {
    const clubs = [...(byState.get(uf) ?? [])].sort(rep);
    const top = finalists(previous, `est-${uf}`)
      .map((id) => clubs.find((c) => c.id === id))
      .filter((c): c is Clubs => c !== undefined);
    const order = [...top, ...clubs.filter((c) => !top.includes(c))];
    chosen.push(...order.slice(0, n));
    rest.push(...order.slice(n));
  }
  const size = Object.values(berths).reduce((s, n) => s + n, 0);
  chosen.push(...rest.sort(rep).slice(0, Math.max(0, size - chosen.length)));
  return chosen.sort(rep).map((c) => c.id);
}

function cup(
  id: string,
  name: string,
  season: number,
  clubIds: string[],
  phases: Phase[],
  prizes: Competition['money']['prizes'],
): Competition {
  const base = regulation(
    // Like the Copa do Brasil, above the league: the CBF keeps these dates for the cup (a league
    // round of a club that has both moves).
    { id, name, season, clubIds, scope: 'regional', tier: null, priority: 2 },
    phases,
  );
  return { ...base, money: { ...base.money, prizes: prizes.filter((p) => p.amount > 0) } };
}

const ko = (
  id: string,
  kind: 'mata-mata' | 'final',
  dates: Phase['dates'],
  entrants: Phase['entrants'],
  legs: 1 | 2,
  survivors: number,
  host: 'fixed' | 'betterCampaign',
): Phase =>
  knockoutPhase(id, kind, dates, {
    entrants,
    legs,
    survivors,
    host,
    outcomes: kind === 'final' ? [{ kind: 'title', positions: [1, 1] }] : [],
  });

const fromPhase = (phaseId: string, to: number): Phase['entrants'] => [
  { from: 'phase', phaseId, positions: [1, to] },
];
const winnerOf = (competitionId: string): Phase['entrants'][number] => ({
  from: 'competition',
  competitionId,
  season: 'same',
  phaseId: 'final',
  positions: [1, 1],
});

function nordeste(season: number, ids: string[]): Competition {
  const w0 = regionalStart(season);
  const p = PRIZES.nordeste;
  const phases: Phase[] = [
    gruposPhase('grupos', 4, win(w0, 0, 35, [3]), { legs: 1, opponents: 'other' }),
    // Group winners and runners-up: single game, the better campaign at home.
    ko(
      'quartas',
      'mata-mata',
      win(w0, 42, 48, [3]),
      [{ from: 'phase', phaseId: 'grupos', positions: [1, 2] }],
      1,
      4,
      'fixed',
    ),
    ko('semi', 'mata-mata', win(w0, 56, 63, [3]), fromPhase('quartas', 4), 2, 2, 'betterCampaign'),
    ko('final', 'final', win(w0, 70, 74, [3, 0]), fromPhase('semi', 2), 2, 1, 'betterCampaign'),
  ];
  return cup(NORDESTE_ID, 'Copa do Nordeste', season, ids, phases, [
    { phaseId: 'quartas', positions: [1, 8], amount: p.quartas },
    { phaseId: 'semi', positions: [1, 4], amount: p.semi },
    { phaseId: 'final', positions: [2, 2], amount: p.runnerUp },
    { phaseId: 'final', positions: [1, 1], amount: p.champion },
  ]);
}

/** One half of the Copa Verde: two groups of six, semi-finals in one game, a two-leg final. */
function half(id: string, name: string, season: number, ids: string[]): Competition {
  const w0 = regionalStart(season);
  const p = PRIZES.verde;
  const phases: Phase[] = [
    gruposPhase('grupos', 2, win(w0, 0, 35, [3]), { legs: 1 }),
    ko(
      'semi',
      'mata-mata',
      win(w0, 42, 48, [3]),
      [{ from: 'phase', phaseId: 'grupos', positions: [1, 2] }],
      1,
      2,
      'fixed',
    ),
    ko('final', 'final', win(w0, 56, 63, [3]), fromPhase('semi', 2), 2, 1, 'betterCampaign'),
  ];
  return cup(id, name, season, ids, phases, [
    { phaseId: 'semi', positions: [1, 4], amount: p.semi },
    { phaseId: 'final', positions: [1, 2], amount: p.final },
  ]);
}

/** The final of the Copa Verde: the two halves' champions, played home and away. */
function verde(season: number): Competition {
  const w0 = regionalStart(season);
  const p = PRIZES.verde;
  const phases: Phase[] = [
    ko(
      'final',
      'final',
      win(w0, 71, 74, [4, 0]),
      [winnerOf(NORTE_ID), winnerOf(CENTRO_OESTE_ID)],
      2,
      1,
      'betterCampaign',
    ),
  ];
  return {
    ...cup(VERDE_ID, 'Copa Verde', season, [], phases, [
      { phaseId: 'final', positions: [2, 2], amount: p.runnerUp },
      { phaseId: 'final', positions: [1, 1], amount: p.champion },
    ]),
    size: 2,
  };
}

/**
 * The season's regional cups and their clubs. `previous` is last season's results (empty in a
 * career's first season). A cup the pack is too small for is left out; the Copa Verde needs both
 * halves.
 */
export function regionalCompetitions(
  pack: Pack,
  season: number,
  previous: Results,
): { competitions: Competition[]; members: Record<string, string[]> } {
  const cityState = new Map(pack.cities.map((c) => [c.id, c.state]));
  const byState = new Map<string, Clubs[]>();
  for (const c of pack.clubs) {
    const uf = cityState.get(c.cityId);
    if (!uf) continue;
    const list = byState.get(uf);
    if (list) list.push(c);
    else byState.set(uf, [c]);
  }
  const competitions: Competition[] = [];
  const members: Record<string, string[]> = {};
  const add = (c: Competition, ids: string[]) => {
    competitions.push(c);
    members[c.id] = ids;
  };
  // Four groups of five meeting in pairs: a multiple of four.
  const ne = field(byState, NORDESTE_BERTHS, previous);
  const neIds = ne.slice(0, ne.length - (ne.length % 4));
  if (neIds.length >= MIN_CLUBS) add(nordeste(season, neIds), neIds);
  const norte = field(byState, NORTE_BERTHS, previous);
  const centro = field(byState, CENTRO_OESTE_BERTHS, previous);
  if (norte.length >= MIN_CLUBS && centro.length >= MIN_CLUBS) {
    add(half(NORTE_ID, 'Copa Norte', season, norte), norte);
    add(half(CENTRO_OESTE_ID, 'Copa Centro-Oeste', season, centro), centro);
    add(verde(season), []);
  }
  return { competitions, members };
}

/**
 * The Supercopa's two clubs: last season's national champion and Copa do Brasil champion (the
 * national runner-up when one club won both). `members` are the top division's clubs and
 * `ranking` the national ranking, used in a first season that has no last one.
 */
export function supercopaPair(
  serie: Competition,
  members: readonly string[],
  ranking: readonly string[],
  previous: Results,
): [string, string] | null {
  const table =
    previous[serie.id]?.[serie.phases.at(-1)!.id]?.tables[0]?.map((r) => r.clubId) ?? [];
  const copa = finalists(previous, COPA_ID)[0];
  if (table.length >= 2 && copa) return [table[0]!, copa === table[0] ? table[1]! : copa];
  const here = new Set(members);
  const best = ranking.filter((id) => here.has(id));
  return best.length >= 2 ? [best[0]!, best[1]!] : null;
}

/** The Supercopa of the season: one match on the first Sunday of February. */
export function supercopa(season: number, pair: [string, string]): Competition {
  const feb1 = dayOf(`${season}-02-01`);
  const sunday = feb1 + ((7 - weekday(feb1)) % 7);
  const p = PRIZES.supercopa;
  const base = cup(
    SUPERCOPA_ID,
    'Supercopa do Brasil',
    season,
    pair,
    [
      knockoutPhase('final', 'final', win(sunday, 0, 0, [0]), {
        entrants: [{ from: 'list', clubIds: pair }],
        legs: 1,
        survivors: 1,
        // Neutral venue in the real match: the host is drawn. No extra time, penalties.
        host: 'draw',
        tieBreakers: ['penalties'],
        outcomes: [{ kind: 'title', positions: [1, 1] }],
      }),
    ],
    [
      { phaseId: 'final', positions: [1, 2], amount: p.finalists },
      { phaseId: 'final', positions: [1, 1], amount: p.championExtra },
    ],
  );
  // Above the Copa do Brasil (2): a trophy match takes its date.
  return { ...base, priority: 3, scope: 'nacional' };
}
