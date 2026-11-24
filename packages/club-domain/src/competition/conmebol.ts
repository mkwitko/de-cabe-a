/**
 * The CONMEBOL Libertadores and Sudamericana as ordinary competitions of the season
 * (conmebol-data.ts holds the 2026 facts). Brazil's clubs come from the career's last season;
 * the foreign ones are the 2026 entrants and live outside the pack (`foreign-` ids), playing
 * quick results only (career/foreign.ts).
 *
 * Libertadores: first stage (6), second (16), third (8), eight groups of four kept apart by
 * association, round of 16 (group winners against runners-up), quarter- and semi-finals over two
 * legs, a single final on neutral ground with extra time. The third-stage losers go to the
 * Sudamericana groups and the group third places to its play-offs.
 * Sudamericana: a first stage of single matches between clubs of the same association, eight
 * groups, play-offs (group runners-up against the Libertadores third places), round of 16 (group
 * winners against the play-off winners), two-leg quarter- and semi-finals, a single final.
 */
import { gruposPhase, knockoutPhase, regulation } from '../generate/competitions';
import { OPENING } from '../market/currency';
import { dayOf, isoOf, weekday } from './calendar';
import { associationOf, isForeignClub } from './groups';
import type { Results } from './outcomes';
import type { Competition, Phase } from './schema';
import {
  BRAZIL_PLACES,
  DATES,
  FOREIGN_CLUBS,
  INTERCONTINENTAL_FOREIGN,
  LIBERTADORES_FOREIGN,
  PRIZES_USD,
  SUDAMERICANA_FOREIGN,
} from './conmebol-data';
import { COPA_ID } from './copa';

export const LIBERTADORES_ID = 'libertadores';
export const SUDAMERICANA_ID = 'sudamericana';
export const RECOPA_ID = 'recopa';
export const INTERCONTINENTAL_ID = 'intercontinental';
export const isConmebol = (c: { id: string }) =>
  c.id === LIBERTADORES_ID || c.id === SUDAMERICANA_ID;
export { associationOf, isForeignClub } from './groups';

const FOREIGN = new Map(FOREIGN_CLUBS.map((c) => [c.id, c]));
export const foreignClub = (id: string) => FOREIGN.get(id);

/** USD to reais at base prices, at the career's opening rate. */
const reais = (usd: number) => Math.round((usd * OPENING.USD) / 10_000);

const shift = (iso: string, years: number) => `${Number(iso.slice(0, 4)) + years}${iso.slice(4)}`;
/** A stage's window moved to `season`: Wednesday and Thursday, three days clear of a Sunday. */
const window = (range: readonly [string, string], season: number, weekdays = [3, 4]) => ({
  start: shift(range[0], season - 2026),
  end: shift(range[1], season - 2026),
  weekdays,
});
/** A single final: the Saturday of its week (28 Nov 2026), on neutral ground. */
const finalWindow = (day: string, season: number) => {
  const start = dayOf(shift(day, season - 2026));
  return { start: isoOf(start), end: isoOf(start + 6), weekdays: [6] };
};

const fromPhase = (phaseId: string, from: number, to: number): Phase['entrants'][number] => ({
  from: 'phase',
  phaseId,
  positions: [from, to],
});
const twoLegs = (
  id: string,
  dates: Phase['dates'],
  entrants: Phase['entrants'],
  survivors: number,
  pairing: 'seeded' | 'draw' | 'fixed' = 'seeded',
): Phase =>
  knockoutPhase(id, 'mata-mata', dates, {
    entrants,
    legs: 2,
    survivors,
    pairing,
    host: 'betterCampaign',
    // No away goals since 2022, no extra time before the final: penalties.
    tieBreakers: ['penalties'],
  });
const final = (dates: Phase['dates'], entrants: Phase['entrants']): Phase =>
  knockoutPhase('final', 'final', dates, {
    entrants,
    legs: 1,
    survivors: 1,
    pairing: 'fixed',
    host: 'draw',
    tieBreakers: ['extraTime', 'penalties'],
    outcomes: [{ kind: 'title', positions: [1, 1] }],
  });
const groups = (dates: Phase['dates'], entrants: Phase['entrants']): Phase =>
  gruposPhase('grupos', 8, dates, { entrants, legs: 2, draw: 'association' });

/** Brazil's clubs in each cup this season, best first. */
export interface ConmebolField {
  libertadoresGroups: string[];
  libertadoresSecond: string[];
  sudamericana: string[];
}

/**
 * Brazil's places from last season: the Libertadores holder and the Copa do Brasil champion,
 * then the Série A order into the Libertadores and, after it, the Sudamericana (BRAZIL_PLACES).
 * A first season, with no last one, takes the Série A clubs by `ranking`. Null without a Série A.
 */
export function conmebolField(
  serieA: readonly string[],
  ranking: readonly string[],
  previous: Results,
  serieId: string,
  lastPhaseId: string,
): ConmebolField | null {
  if (serieA.length < 20) return null;
  const table = previous[serieId]?.[lastPhaseId]?.tables[0]?.map((r) => r.clubId);
  const order = table?.length
    ? table
    : [...serieA].sort((a, b) => ranking.indexOf(a) - ranking.indexOf(b));
  const taken = new Set<string>();
  const take = (ids: readonly (string | undefined)[], n: number) => {
    const out: string[] = [];
    for (const id of ids) {
      if (out.length === n) break;
      if (id === undefined || taken.has(id) || isForeignClub(id)) continue;
      taken.add(id);
      out.push(id);
    }
    return out;
  };
  const champion = (id: string) => previous[id]?.final?.tables[0]?.[0]?.clubId;
  const libertadoresGroups = [...take([champion(LIBERTADORES_ID), champion(COPA_ID)], 2)];
  libertadoresGroups.push(
    ...take(order, BRAZIL_PLACES.libertadoresGroups - libertadoresGroups.length),
  );
  const libertadoresSecond = take(order, BRAZIL_PLACES.libertadoresSecond);
  const sudamericana = take(order, BRAZIL_PLACES.sudamericana);
  return { libertadoresGroups, libertadoresSecond, sudamericana };
}

/** The clubs of each cup this season (members), for the career's continental stand-in. */
export const conmebolClubs = (f: ConmebolField): Set<string> =>
  new Set([...f.libertadoresGroups, ...f.libertadoresSecond, ...f.sudamericana]);

/** The foreign clubs of each stage of entry, in one season. */
export interface ForeignEntrants {
  libertadores: Record<'groups' | 'second' | 'first', string[]>;
  sudamericana: Record<'groups' | 'first', string[]>;
}

/** How far a club may move in its country's order from one season to the next, in places. */
const SWING = 3;

/**
 * The foreign entrants of `season`. 2026 is the real field. From 2027 the career plays no
 * foreign league, so each association keeps its 2026 places in each stage and fills them from
 * its clubs here, best first by their 2026 order, each club moved by up to `SWING` places by a
 * draw of the career's seed and the season: the field changes, the strong clubs stay near the
 * top. PARÂMETRO, until foreign leagues exist.
 */
export function foreignEntrants(season: number, seed: number): ForeignEntrants {
  const real: ForeignEntrants = {
    libertadores: {
      groups: [...LIBERTADORES_FOREIGN.groups],
      second: [...LIBERTADORES_FOREIGN.second],
      first: [...LIBERTADORES_FOREIGN.first],
    },
    sudamericana: {
      groups: [...SUDAMERICANA_FOREIGN.groups],
      first: [...SUDAMERICANA_FOREIGN.first],
    },
  };
  if (season <= 2026) return real;
  // The 2026 order of every place, best first; each place keeps its country.
  const places: [keyof ForeignEntrants, string, string][] = [
    ...real.libertadores.groups.map(
      (id) => ['libertadores', 'groups', id] as [keyof ForeignEntrants, string, string],
    ),
    ...real.libertadores.second.map(
      (id) => ['libertadores', 'second', id] as [keyof ForeignEntrants, string, string],
    ),
    ...real.libertadores.first.map(
      (id) => ['libertadores', 'first', id] as [keyof ForeignEntrants, string, string],
    ),
    ...real.sudamericana.groups.map(
      (id) => ['sudamericana', 'groups', id] as [keyof ForeignEntrants, string, string],
    ),
    ...real.sudamericana.first.map(
      (id) => ['sudamericana', 'first', id] as [keyof ForeignEntrants, string, string],
    ),
  ];
  const draw = (id: string) => {
    let h = Math.imul(2166136261 ^ season, 16777619) ^ seed;
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
    h ^= h >>> 15;
    return ((h >>> 0) % 1000) / 1000;
  };
  const out: ForeignEntrants = {
    libertadores: { groups: [], second: [], first: [] },
    sudamericana: { groups: [], first: [] },
  };
  for (const country of new Set(places.map(([, , id]) => associationOf(id)))) {
    const own = places.filter(([, , id]) => associationOf(id) === country);
    const clubs = own
      .map(([, , id], i) => ({ id, score: i + draw(id) * SWING * 2 - SWING }))
      .sort((a, b) => a.score - b.score || (a.id < b.id ? -1 : 1));
    own.forEach(([cup, stage], i) => {
      (out[cup] as Record<string, string[]>)[stage]!.push(clubs[i]!.id);
    });
  }
  return out;
}

const L = PRIZES_USD.libertadores;
const S = PRIZES_USD.sudamericana;

export function libertadores(
  season: number,
  f: ConmebolField,
  e: ForeignEntrants = foreignEntrants(season, 0),
): Competition {
  const d = DATES.libertadores;
  const groupList = [...f.libertadoresGroups, ...e.libertadores.groups];
  const phases: Phase[] = [
    twoLegs(
      'fase-1',
      window(d.first, season),
      [{ from: 'list', clubIds: [...e.libertadores.first] }],
      3,
      'draw',
    ),
    twoLegs(
      'fase-2',
      window(d.second, season),
      [
        { from: 'list', clubIds: [...f.libertadoresSecond, ...e.libertadores.second] },
        fromPhase('fase-1', 1, 3),
      ],
      8,
      'draw',
    ),
    twoLegs('fase-3', window(d.third, season), [fromPhase('fase-2', 1, 8)], 4, 'fixed'),
    groups(window(d.groups, season), [
      { from: 'list', clubIds: groupList },
      fromPhase('fase-3', 1, 4),
    ]),
    // Group winners against runners-up: winners first, then runners-up, seeded 1 v 16.
    twoLegs('oitavas', window(d.r16, season), [fromPhase('grupos', 1, 2)], 8),
    twoLegs('quartas', window(d.quarters, season), [fromPhase('oitavas', 1, 8)], 4, 'fixed'),
    twoLegs('semi', window(d.semis, season), [fromPhase('quartas', 1, 4)], 2, 'fixed'),
    final(finalWindow(d.final[0], season), [fromPhase('semi', 1, 2)]),
  ];
  const base = regulation(
    {
      id: LIBERTADORES_ID,
      name: 'Libertadores',
      season,
      clubIds: [
        ...groupList,
        ...f.libertadoresSecond,
        ...e.libertadores.second,
        ...e.libertadores.first,
      ],
      scope: 'continental',
      tier: null,
      // CONMEBOL dates come first: a league round of a club in it moves.
      priority: 2,
    },
    phases,
  );
  return {
    ...base,
    money: {
      ...base.money,
      prizes: [
        { phaseId: 'fase-1', positions: [1, 6], amount: reais(L.first) },
        { phaseId: 'fase-2', positions: [1, 16], amount: reais(L.second) },
        { phaseId: 'fase-3', positions: [1, 8], amount: reais(L.third) },
        { phaseId: 'oitavas', positions: [1, 16], amount: reais(L.r16) },
        { phaseId: 'quartas', positions: [1, 8], amount: reais(L.quarters) },
        { phaseId: 'semi', positions: [1, 4], amount: reais(L.semis) },
        { phaseId: 'final', positions: [2, 2], amount: reais(L.runnerUp) },
        { phaseId: 'final', positions: [1, 1], amount: reais(L.champion) },
      ],
    },
  };
}

/** Group-stage money: the share of every club in the groups, and each win there. */
export const GROUP_MONEY = {
  [LIBERTADORES_ID]: { stage: reais(L.groupStage), win: reais(L.groupWin) },
  [SUDAMERICANA_ID]: { stage: reais(S.groupStage), win: reais(S.groupWin) },
} as const;

export function sudamericana(
  season: number,
  f: ConmebolField,
  e: ForeignEntrants = foreignEntrants(season, 0),
): Competition {
  const d = DATES.sudamericana;
  const libertadores = (phaseId: string, from: number, to: number): Phase['entrants'][number] => ({
    from: 'competition',
    competitionId: LIBERTADORES_ID,
    season: 'same',
    phaseId,
    positions: [from, to],
  });
  const phases: Phase[] = [
    // Sixteen single matches, clubs of one association against each other (`fixed`: in list order).
    knockoutPhase('fase-1', 'mata-mata', window(d.first, season), {
      entrants: [{ from: 'list', clubIds: [...e.sudamericana.first] }],
      legs: 1,
      survivors: 16,
      pairing: 'fixed',
      host: 'draw',
      tieBreakers: ['penalties'],
    }),
    groups(window(d.groups, season), [
      { from: 'list', clubIds: [...f.sudamericana, ...e.sudamericana.groups] },
      fromPhase('fase-1', 1, 16),
      // The Libertadores third-stage losers.
      libertadores('fase-3', 5, 8),
    ]),
    // Group runners-up against the Libertadores group third places.
    twoLegs(
      'playoffs',
      window(d.playoffs, season),
      [fromPhase('grupos', 2, 2), libertadores('grupos', 3, 3)],
      8,
    ),
    twoLegs(
      'oitavas',
      window(d.r16, season),
      [fromPhase('grupos', 1, 1), fromPhase('playoffs', 1, 8)],
      8,
    ),
    twoLegs('quartas', window(d.quarters, season), [fromPhase('oitavas', 1, 8)], 4, 'fixed'),
    twoLegs('semi', window(d.semis, season), [fromPhase('quartas', 1, 4)], 2, 'fixed'),
    final(finalWindow(d.final[0], season), [fromPhase('semi', 1, 2)]),
  ];
  const base = regulation(
    {
      id: SUDAMERICANA_ID,
      name: 'Sul-Americana',
      season,
      clubIds: [...f.sudamericana, ...e.sudamericana.groups, ...e.sudamericana.first],
      scope: 'continental',
      tier: null,
      priority: 2,
    },
    phases,
  );
  return {
    ...base,
    money: {
      ...base.money,
      prizes: [
        { phaseId: 'playoffs', positions: [1, 16], amount: reais(S.playoffs) },
        { phaseId: 'oitavas', positions: [1, 16], amount: reais(S.r16) },
        { phaseId: 'quartas', positions: [1, 8], amount: reais(S.quarters) },
        { phaseId: 'semi', positions: [1, 4], amount: reais(S.semis) },
        { phaseId: 'final', positions: [2, 2], amount: reais(S.runnerUp) },
        { phaseId: 'final', positions: [1, 1], amount: reais(S.champion) },
      ],
    },
  };
}

/**
 * The Recopa's two clubs: last season's Libertadores champion (hosts the second leg) and
 * Sudamericana champion. Null without both, or when neither is Brazilian (conmebol-data NOTES).
 */
export function recopaPair(previous: Results): [string, string] | null {
  const champion = (id: string) => previous[id]?.final?.tables[0]?.[0]?.clubId;
  const lib = champion(LIBERTADORES_ID);
  const sud = champion(SUDAMERICANA_ID);
  if (!lib || !sud || lib === sud || (isForeignClub(lib) && isForeignClub(sud))) return null;
  return [lib, sud];
}

/** The Recopa of `season`: two legs on the Thursdays from 19 February (2026: 19 and 26 Feb). */
export function recopa(season: number, pair: [string, string]): Competition {
  const feb19 = dayOf(`${season}-02-19`);
  const first = feb19 + ((4 - weekday(feb19) + 7) % 7);
  const R = PRIZES_USD.recopa;
  const base = regulation(
    {
      id: RECOPA_ID,
      name: 'Recopa Sul-Americana',
      season,
      clubIds: [...pair],
      scope: 'continental',
      tier: null,
      // A trophy tie, like the Supercopa: above the estaduais and the Copa do Brasil.
      priority: 3,
    },
    [
      knockoutPhase(
        'final',
        'final',
        { start: isoOf(first), end: isoOf(first + 7), weekdays: [4] },
        {
          entrants: [{ from: 'list', clubIds: [...pair] }],
          legs: 2,
          survivors: 1,
          pairing: 'fixed',
          host: 'fixed',
          tieBreakers: ['penalties'],
          outcomes: [{ kind: 'title', positions: [1, 1] }],
        },
      ),
    ],
  );
  return {
    ...base,
    money: {
      ...base.money,
      prizes: [
        { phaseId: 'final', positions: [2, 2], amount: reais(R.runnerUp) },
        { phaseId: 'final', positions: [1, 1], amount: reais(R.champion) },
      ],
    },
  };
}

/**
 * The FIFA Intercontinental Cup of `season` (conmebol-data.ts `INTERCONTINENTAL_FOREIGN`): the
 * Libertadores champion of the same season against Toluca in the Derby of the Americas, then
 * Mamelodi Sundowns in the Challenger Cup, then PSG in the final; single matches on neutral
 * ground (match/stadium.ts `neutralVenue`) from the second Wednesday of December.
 */
export function intercontinental(season: number): Competition {
  const dec1 = dayOf(`${season}-12-01`);
  const derby = dec1 + ((3 - weekday(dec1) + 7) % 7) + 7;
  const on = (day: number) => ({ start: isoOf(day), end: isoOf(day), weekdays: [weekday(day)] });
  const single = (
    id: string,
    kind: 'mata-mata' | 'final',
    day: number,
    entrants: Phase['entrants'],
  ): Phase =>
    knockoutPhase(id, kind, on(day), {
      entrants,
      legs: 1,
      survivors: 1,
      pairing: 'fixed',
      // Neutral ground: the host is drawn only for the listing.
      host: 'draw',
      tieBreakers: ['extraTime', 'penalties'],
      outcomes: kind === 'final' ? [{ kind: 'title', positions: [1, 1] }] : [],
    });
  const f = INTERCONTINENTAL_FOREIGN;
  const I = PRIZES_USD.intercontinental;
  const base = regulation(
    {
      id: INTERCONTINENTAL_ID,
      name: 'Copa Intercontinental',
      season,
      clubIds: [f.derby, f.challenger, f.final],
      scope: 'continental',
      tier: null,
      priority: 3,
    },
    [
      single('derby', 'mata-mata', derby, [
        {
          from: 'competition',
          competitionId: LIBERTADORES_ID,
          season: 'same',
          phaseId: 'final',
          positions: [1, 1],
        },
        { from: 'list', clubIds: [f.derby] },
      ]),
      single('challenger', 'mata-mata', derby + 3, [
        fromPhase('derby', 1, 1),
        { from: 'list', clubIds: [f.challenger] },
      ]),
      single('final', 'final', derby + 7, [
        fromPhase('challenger', 1, 1),
        { from: 'list', clubIds: [f.final] },
      ]),
    ],
  );
  return {
    ...base,
    money: {
      ...base.money,
      // By the furthest stage reached, not added up.
      prizes: [
        { phaseId: 'derby', positions: [2, 2], amount: reais(I.derby) },
        { phaseId: 'challenger', positions: [2, 2], amount: reais(I.challenger) },
        { phaseId: 'final', positions: [2, 2], amount: reais(I.runnerUp) },
        { phaseId: 'final', positions: [1, 1], amount: reais(I.champion) },
      ],
    },
  };
}
