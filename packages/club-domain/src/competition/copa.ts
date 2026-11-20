/**
 * Copa do Brasil as a played competition. Regulation data, versioned by season, and the field.
 *
 * Source: CBF "Regulamento Específico da Competição" (REC) of the Copa do Brasil 2026 and its
 * basic table, published 6 Jan 2026 (cbf.com.br, news "CBF divulga tabela básica, plano geral de
 * ações e regulamento específico da Copa do Brasil 2026"), with the press summaries of the same
 * documents (Lance!, O Imparcial, Band, 90min, Jan-Feb 2026). What they state, and what this file
 * holds:
 *  - 126 clubs in nine knockout phases, 18 Feb to 6 Dec 2026, 155 matches. Group 3 (102 clubs,
 *    state-championship places and CBF ranking) enters at the 1st phase (the 28 lowest in the CBF
 *    ranking) and the 2nd (74); group 2 (4 clubs: Série C, Série D, Copa Verde and Copa do
 *    Nordeste champions) at the 3rd; group 1 (the 20 Série A clubs) at the 5th.
 *  - Phases: 1st 28 -> 14, 2nd 88 -> 44, 3rd 48 -> 24, 4th 24 -> 12, 5th 32 -> 16, round of 16,
 *    quarters and semi-finals; one match in the 1st to 4th phases and in the final (6 Dec), two
 *    legs from the 5th phase to the semi-finals.
 *  - Away goals do not count (CBF dropped them from the Copa do Brasil); a tie level after the
 *    match or the second leg goes straight to penalties, without extra time. The draw sets the
 *    home sides of the single matches; the second leg goes to the better campaign. The CBF pays
 *    the visiting club's trip. The champion takes a place in the Libertadores group stage, the
 *    runner-up one in the preliminary (CONMEBOL access 2027); the champion also plays the Supercopa.
 *
 * What the pack cannot give, and the rule used instead (ASSUMPTIONS, documented):
 *  - State championships and the CBF ranking are not in the pack. Group 2 is the two best-ranked
 *    Série C and the two best-ranked Série D clubs (the real four are the champions of Série C
 *    and D and of two regional cups). Group 3 is the 102 best-ranked clubs of the three lower
 *    divisions left, ranked by the career's national ranking (the real list is state places plus
 *    CBF ranking vacancies); its 28 lowest start in the 1st phase, as in the REC.
 *  - Dates: the REC base dates are Wednesdays (the semi-finals and the final are Sundays). Each
 *    phase is a window holding one date per round on a weekday (a 7- or 14-day window always has
 *    one or two), so the same windows work in every later year. The 5th phase's second leg is
 *    three weeks after the first in 2026 (22 Apr, 13 May); a window can only space the legs at
 *    the weekdays it holds, so they fall two weeks apart.
 *  - The draw is free and seeded by the career seed (the REC seeds nobody here).
 */
import type { Competition, Phase } from './schema';

export const COPA_ID = 'copa-do-brasil';
/** Phase ids in play order; the stage index (0..8) is the position in this list. */
export const COPA_PHASES = [
  'fase-1',
  'fase-2',
  'fase-3',
  'fase-4',
  'fase-5',
  'oitavas',
  'quartas',
  'semifinal',
  'final',
] as const;

/** Clubs of each entry group (CBF REC 2026). */
export const COPA_GROUPS = { serieA: 20, others: 4, ranking: 102 } as const;
export const COPA_FIRST_PHASE = 28;

export interface CopaField {
  /** The 20 Série A clubs, entering at the 5th phase. */
  serieA: string[];
  /** The four group 2 clubs, entering at the 3rd. */
  group2: string[];
  /** Group 3 by national ranking, best first; the last 28 play the 1st phase. */
  group3: string[];
}

export interface TierMembers {
  tier: number;
  clubIds: readonly string[];
}

/**
 * The field from the divisions' members and the national ranking (best first), or null when the
 * pack is too small for the real format (126 clubs): then the career has no Copa.
 */
export function copaField(
  tiers: readonly TierMembers[],
  ranking: readonly string[],
): CopaField | null {
  const at = new Map(ranking.map((id, i) => [id, i]));
  const rank = (id: string) => at.get(id) ?? ranking.length;
  const best = (ids: readonly string[]) =>
    [...ids].sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1));
  const of = (tier: number) => tiers.find((t) => t.tier === tier)?.clubIds ?? [];
  const serieA = [...of(1)];
  if (serieA.length !== COPA_GROUPS.serieA) return null;
  const c = best(of(3)).slice(0, 2);
  const d = best(of(4)).slice(0, 2);
  const group2 = [...c, ...d];
  if (group2.length !== COPA_GROUPS.others) return null;
  const taken = new Set([...serieA, ...group2]);
  const rest = best(
    tiers.filter((t) => t.tier > 1).flatMap((t) => t.clubIds.filter((id) => !taken.has(id))),
  );
  if (rest.length < COPA_GROUPS.ranking) return null;
  return { serieA, group2, group3: rest.slice(0, COPA_GROUPS.ranking) };
}

interface Spec {
  /** First season this regulation applies to; later seasons repeat it with the dates moved. */
  from: number;
  /** [start, end, weekdays] of each phase, as dates of `from`. */
  windows: Record<(typeof COPA_PHASES)[number], [string, string, number[]]>;
}

/** Regulations by season; one row now (2026), a new row when the CBF changes the format. */
const SPECS: Spec[] = [
  {
    from: 2026,
    windows: {
      'fase-1': ['2026-02-18', '2026-02-24', [3]],
      'fase-2': ['2026-02-25', '2026-03-03', [3]],
      'fase-3': ['2026-03-11', '2026-03-17', [3]],
      'fase-4': ['2026-03-18', '2026-03-24', [3]],
      'fase-5': ['2026-04-22', '2026-05-13', [3]],
      oitavas: ['2026-07-29', '2026-08-11', [3]],
      quartas: ['2026-08-26', '2026-09-08', [3]],
      semifinal: ['2026-11-01', '2026-11-14', [0]],
      final: ['2026-12-06', '2026-12-12', [0]],
    },
  },
];

const shift = (iso: string, years: number) => `${Number(iso.slice(0, 4)) + years}${iso.slice(4)}`;

/** The regulation of `season` for a field; the latest spec not after the season, dates moved. */
export function copaDoBrasil(season: number, field: CopaField): Competition {
  const spec = SPECS.filter((s) => s.from <= season).at(-1) ?? SPECS[0]!;
  const years = season - spec.from;
  const dates = (id: (typeof COPA_PHASES)[number]) => {
    const [start, end, weekdays] = spec.windows[id];
    return { start: shift(start, years), end: shift(end, years), weekdays };
  };
  const g3 = field.group3;
  const entering = g3.length - COPA_FIRST_PHASE;
  const from = (phaseId: string, n: number) => ({
    from: 'phase' as const,
    phaseId,
    positions: [1, n] as [number, number],
  });
  const phase = (
    i: number,
    kind: 'mata-mata' | 'final',
    entrants: Phase['entrants'],
    legs: 1 | 2,
    survivors: number,
    host: 'draw' | 'betterCampaign',
    outcomes: Phase['outcomes'] = [],
  ): Phase => ({
    kind,
    id: COPA_PHASES[i]!,
    entrants,
    dates: dates(COPA_PHASES[i]!),
    outcomes,
    legs,
    pairing: 'draw',
    host,
    survivors,
    // No away goals, no extra time: level after the match or the aggregate, penalties.
    tieBreakers: ['penalties'],
  });
  const place = (target: string, targetPhaseId: string, n: number): Phase['outcomes'][number] => ({
    kind: 'slot',
    target,
    targetPhaseId,
    count: 1,
    candidates: [{ phaseId: 'final', positions: [n, n] }],
    excludeRelegated: false,
  });
  const phases: Phase[] = [
    phase(0, 'mata-mata', [{ from: 'list', clubIds: g3.slice(-COPA_FIRST_PHASE) }], 1, 14, 'draw'),
    phase(
      1,
      'mata-mata',
      [from('fase-1', 14), { from: 'list', clubIds: g3.slice(0, entering) }],
      1,
      44,
      'draw',
    ),
    phase(
      2,
      'mata-mata',
      [from('fase-2', 44), { from: 'list', clubIds: field.group2 }],
      1,
      24,
      'draw',
    ),
    phase(3, 'mata-mata', [from('fase-3', 24)], 1, 12, 'draw'),
    // Série A first: the better seed hosts the second leg when the campaigns are level.
    phase(
      4,
      'mata-mata',
      [{ from: 'list', clubIds: field.serieA }, from('fase-4', 12)],
      2,
      16,
      'betterCampaign',
    ),
    phase(5, 'mata-mata', [from('fase-5', 16)], 2, 8, 'betterCampaign'),
    phase(6, 'mata-mata', [from('oitavas', 8)], 2, 4, 'betterCampaign'),
    phase(7, 'mata-mata', [from('quartas', 4)], 2, 2, 'betterCampaign'),
    phase(8, 'final', [from('semifinal', 2)], 1, 1, 'draw', [
      { kind: 'title', positions: [1, 1] },
      // Places the CBF gives (CONMEBOL access 2027): kept for the seasons that play them.
      place('libertadores', 'grupos', 1),
      place('libertadores', 'preliminar', 2),
      place('supercopa-do-brasil', 'final', 1),
    ]),
  ];
  const size = COPA_GROUPS.serieA + COPA_GROUPS.others + g3.length;
  return {
    id: COPA_ID,
    name: 'Copa do Brasil',
    season,
    scope: 'nacional',
    tier: null,
    category: 'profissional',
    // A cup date wins over a league date (05 §4): the league round is moved.
    priority: 2,
    size,
    refill: null,
    clubIds: [],
    registration: {
      maxSquad: null,
      changes: null,
      maxForeign: null,
      ageLimit: null,
      transferLockAfterMatches: null,
      windows: [],
      reRegistrationAfterPhase: null,
    },
    matchRules: {
      subs: 5,
      subWindows: 3,
      concussionSubs: 1,
      videoReferee: true,
      suspensionAfterYellows: 3,
      minRestHours: 66,
    },
    money: {
      prizes: [],
      // The CBF pays the visiting club's trip in the Copa do Brasil.
      travel: {
        payer: 'organiser',
        busFromKm: null,
        planeFromKm: null,
        people: null,
        nights: null,
        conditional: false,
      },
    },
    phases,
  };
}

/** All clubs of a field, in the order the regulation lists them. */
export const copaMembers = (f: CopaField): string[] => [...f.serieA, ...f.group2, ...f.group3];
