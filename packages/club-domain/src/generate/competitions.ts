/**
 * Regulation builders for the fictional packs (MC-014). Defaults follow the
 * national series of 05 §8 (FATO): 50 registered with 8 changes, 12-match
 * transfer lock, 5 substitutions in 3 windows plus 1 for concussion, 66 h rest,
 * three yellows suspend. Prizes are empty until the finance tasks.
 */
import type { Competition, Phase, TableBreaker } from '../competition/schema';

const CBF_BREAKERS: TableBreaker[] = [
  'wins',
  'goalDifference',
  'goalsFor',
  'headToHead',
  'redCards',
  'yellowCards',
  'draw',
];
const POINTS = { win: 3, draw: 1, loss: 0 };

export type Base = Pick<Competition, 'id' | 'name' | 'season' | 'clubIds'> &
  Partial<Omit<Competition, 'id' | 'name' | 'season' | 'clubIds' | 'phases'>>;

export function regulation(b: Base, phases: Phase[]): Competition {
  return {
    scope: 'nacional',
    tier: null,
    category: 'profissional',
    priority: 1,
    size: b.clubIds.length,
    refill: null,
    registration: {
      maxSquad: 50,
      changes: 8,
      maxForeign: null,
      ageLimit: null,
      transferLockAfterMatches: 12,
      windows: [
        { start: `${b.season}-01-04`, end: `${b.season}-03-02` },
        { start: `${b.season}-07-19`, end: `${b.season}-09-10` },
      ],
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
      travel: {
        payer: 'club',
        busFromKm: null,
        planeFromKm: null,
        people: null,
        nights: null,
        conditional: false,
      },
    },
    ...b,
    phases,
  };
}

type Window = Phase['dates'];
export const dateWindow = (
  season: number,
  from: string,
  to: string,
  weekdays = [0, 3],
): Window => ({
  start: `${season}-${from}`,
  end: `${season}-${to}`,
  weekdays,
});

export const ligaPhase = (
  id: string,
  dates: Window,
  extra: Partial<Extract<Phase, { kind: 'liga' }>> = {},
): Phase => ({
  kind: 'liga',
  id,
  entrants: [{ from: 'members' }],
  dates,
  outcomes: [],
  legs: 2,
  points: POINTS,
  tieBreakers: CBF_BREAKERS,
  ...extra,
});

export const gruposPhase = (
  id: string,
  groups: number,
  dates: Window,
  extra: Partial<Extract<Phase, { kind: 'grupos' }>> = {},
): Phase => ({
  kind: 'grupos',
  id,
  entrants: [{ from: 'members' }],
  dates,
  outcomes: [],
  legs: 2,
  points: POINTS,
  tieBreakers: CBF_BREAKERS.filter((b) => b !== 'headToHead'),
  groups,
  draw: 'pots',
  opponents: 'own',
  ...extra,
});

export const knockoutPhase = (
  id: string,
  kind: 'mata-mata' | 'final',
  dates: Window,
  extra: Partial<Extract<Phase, { kind: 'mata-mata' }>> = {},
): Phase => ({
  kind,
  id,
  entrants: [{ from: 'members' }],
  dates,
  outcomes: [],
  legs: 2,
  pairing: 'seeded',
  host: 'betterCampaign',
  survivors: 1,
  tieBreakers: ['penalties'],
  ...extra,
});

/** One double round-robin league, Série A dates (05 §8: late January to early December). */
export const simpleLeague = (b: Base): Competition =>
  regulation(b, [ligaPhase('liga', dateWindow(b.season, '01-27', '12-01'))]);

/** `br-dev-mini`: a short league, semi-finals in one game, a final. 28 + 2 + 1 matches. */
export const miniCup = (clubIds: string[]): Competition =>
  regulation(
    { id: 'dev-league', name: 'Liga de Desenvolvimento', season: 2026, tier: 1, clubIds },
    [
      ligaPhase('liga', dateWindow(2026, '02-01', '04-30'), {
        legs: 1,
      }),
      knockoutPhase('semi', 'mata-mata', dateWindow(2026, '05-03', '05-10'), {
        entrants: [{ from: 'phase', phaseId: 'liga', positions: [1, 4] }],
        legs: 1,
        survivors: 2,
        tieBreakers: ['extraTime', 'penalties'],
      }),
      knockoutPhase('final', 'final', dateWindow(2026, '05-17', '05-24'), {
        entrants: [{ from: 'phase', phaseId: 'semi', positions: [1, 2] }],
        legs: 1,
        tieBreakers: ['extraTime', 'penalties'],
        outcomes: [{ kind: 'title', positions: [1, 1] }],
      }),
    ],
  );

/**
 * `br-dev-1` divisions, shaped like the 2026 national series (05 §8) at a
 * steady state: four up and four down between every pair of divisions
 * (the real Série C sends two down; the fictional pack keeps the sizes
 * fixed). Fictional names; dates inside the real season.
 */
export function devDivisions(season: number, [a, b, c, d]: string[][]): Competition[] {
  const w = (from: string, to: string, days?: number[]) => dateWindow(season, from, to, days);
  const div = (tier: number, clubIds: string[], name: string) => ({
    id: `div-${tier}`,
    name,
    season,
    tier,
    clubIds: clubIds,
  });
  return [
    regulation(div(1, a!, 'Primeira Divisão'), [
      ligaPhase('liga', w('01-27', '12-01'), {
        outcomes: [
          { kind: 'title', positions: [1, 1] },
          { kind: 'relegation', target: 'div-2', positions: [17, 20] },
        ],
      }),
    ]),
    regulation(div(2, b!, 'Segunda Divisão'), [
      ligaPhase('liga', w('03-21', '11-15', [6, 2]), {
        outcomes: [
          { kind: 'title', positions: [1, 1] },
          { kind: 'promotion', target: 'div-1', positions: [1, 2] },
          { kind: 'relegation', target: 'div-3', positions: [17, 20] },
        ],
      }),
      // 3rd v 6th and 4th v 5th over two legs; the better campaign goes through on a level aggregate.
      knockoutPhase('acesso', 'mata-mata', w('11-21', '12-06', [6, 3]), {
        entrants: [{ from: 'phase', phaseId: 'liga', positions: [3, 6] }],
        survivors: 2,
        tieBreakers: ['betterCampaign'],
        outcomes: [{ kind: 'promotion', target: 'div-1', positions: [1, 2] }],
      }),
    ]),
    regulation(div(3, c!, 'Terceira Divisão'), [
      ligaPhase('liga', w('04-05', '08-30', [0]), {
        legs: 1,
        tieBreakers: ['wins', 'goalDifference', 'goalsFor', 'redCards', 'yellowCards', 'draw'],
        outcomes: [{ kind: 'relegation', target: 'div-4', positions: [17, 20] }],
      }),
      gruposPhase('quadrangular', 2, w('09-06', '10-25', [0]), {
        entrants: [{ from: 'phase', phaseId: 'liga', positions: [1, 8] }],
        outcomes: [{ kind: 'promotion', target: 'div-2', positions: [1, 2] }],
      }),
      knockoutPhase('final', 'final', w('11-01', '11-15', [0]), {
        entrants: [{ from: 'phase', phaseId: 'quadrangular', positions: [1, 1] }],
        outcomes: [{ kind: 'title', positions: [1, 1] }],
      }),
    ]),
    regulation(div(4, d!, 'Quarta Divisão'), [
      gruposPhase('grupos', 16, w('04-12', '07-12', [0]), { draw: 'regional' }),
      // Round of 64 to the last four, who go up.
      knockoutPhase('mata-mata', 'mata-mata', w('07-19', '09-13'), {
        entrants: [{ from: 'phase', phaseId: 'grupos', positions: [1, 4] }],
        survivors: 4,
        outcomes: [{ kind: 'promotion', target: 'div-3', positions: [1, 4] }],
      }),
      knockoutPhase('final', 'final', w('09-16', '10-11'), {
        entrants: [{ from: 'phase', phaseId: 'mata-mata', positions: [1, 4] }],
        outcomes: [{ kind: 'title', positions: [1, 1] }],
      }),
    ]),
  ];
}

const organiserPays = (
  busFromKm: number | null,
  planeFromKm: number | null,
  nights: number | null,
  conditional: boolean,
): Competition['money']['travel'] => ({
  payer: 'organiser',
  busFromKm,
  planeFromKm,
  people: busFromKm === null ? null : 32,
  nights,
  conditional,
});

/**
 * The four national series with the 2027 formats of 05 §8 (FATO unless marked), for a real pack:
 *  - A: 20 clubs, 38 rounds, four down. B: 38 rounds, then the play-off (3rd v 6th, 4th v 5th,
 *    two legs): two up direct and two through it, four down; the CBF pays the visitor's trip, on
 *    condition. C: 24 clubs in 2027 (single round, eight in two groups of four, two-leg final),
 *    four up, two down, six come up from D; 28 clubs in 2028 (FATO). D: 96 clubs in 16 groups of
 *    six, then a knockout from 64; the four semi-finalists go up, and so do the two winners of a
 *    play-off between the four quarter-final losers (six up in all: FATO count, the play-off
 *    shape is read off the save's 2026 fixtures).
 *  - PARÂMETRO (not published, 05 §8 "NÃO ENCONTRADO"): from 2028 C sends six down (not two) so the
 *    28 clubs stay 28 while D sends six up; D refills from the national ranking (places left by
 *    promotion without relegation) because the 96 places are a format, not a count of members.
 *  - Dates follow the save's 2026 calendar for the same series, moved a year; D's registration
 *    keeps the defaults (05 §8 gives 50 / 8 changes for A, B and C only).
 */
export function realDivisions(season: number, [a, b, c, d]: string[][]): Competition[] {
  const w = (from: string, to: string, days?: number[]) => dateWindow(season, from, to, days);
  const div = (tier: number, clubIds: string[], name: string, size?: number) => ({
    id: `div-${tier}`,
    name,
    season,
    tier,
    clubIds,
    ...(size ? { size } : {}),
  });
  const serieC = (year: number, clubIds: string[], size: number, down: number): Competition => {
    const k = (from: string, to: string, days: number[]) => dateWindow(year, from, to, days);
    return regulation({ ...div(3, clubIds, 'Série C', size), season: year, size }, [
      ligaPhase('liga', k('04-04', '08-30', [6, 0]), {
        legs: 1,
        tieBreakers: ['wins', 'goalDifference', 'goalsFor', 'redCards', 'yellowCards', 'draw'],
        outcomes: [{ kind: 'relegation', target: 'div-4', positions: [size - down + 1, size] }],
      }),
      gruposPhase('quadrangular', 2, k('09-06', '10-11', [6, 0]), {
        entrants: [{ from: 'phase', phaseId: 'liga', positions: [1, 8] }],
        outcomes: [{ kind: 'promotion', target: 'div-2', positions: [1, 2] }],
      }),
      knockoutPhase('final', 'final', k('10-18', '10-25', [6, 0]), {
        entrants: [{ from: 'phase', phaseId: 'quadrangular', positions: [1, 1] }],
        outcomes: [{ kind: 'title', positions: [1, 1] }],
      }),
    ]);
  };
  const withTravel = (comp: Competition, travel: Competition['money']['travel']): Competition => ({
    ...comp,
    money: { ...comp.money, travel },
  });
  return [
    regulation(div(1, a!, 'Série A'), [
      ligaPhase('liga', w('01-27', '12-01'), {
        outcomes: [
          { kind: 'title', positions: [1, 1] },
          { kind: 'relegation', target: 'div-2', positions: [17, 20] },
        ],
      }),
    ]),
    withTravel(
      regulation(div(2, b!, 'Série B'), [
        ligaPhase('liga', w('03-21', '11-15', [6, 2]), {
          outcomes: [
            { kind: 'title', positions: [1, 1] },
            { kind: 'promotion', target: 'div-1', positions: [1, 2] },
            { kind: 'relegation', target: 'div-3', positions: [17, 20] },
          ],
        }),
        // 3rd v 6th and 4th v 5th over two legs; the better campaign goes through on a level aggregate.
        knockoutPhase('acesso', 'mata-mata', w('11-21', '11-28', [6, 0]), {
          entrants: [{ from: 'phase', phaseId: 'liga', positions: [3, 6] }],
          survivors: 2,
          tieBreakers: ['betterCampaign'],
          outcomes: [{ kind: 'promotion', target: 'div-1', positions: [1, 2] }],
        }),
      ]),
      organiserPays(null, null, null, true),
    ),
    withTravel(serieC(season, c!, 24, 2), organiserPays(200, 500, null, false)),
    // 2028 onwards (see the PARÂMETRO above): 28 clubs, six down.
    withTravel(serieC(season + 1, [], 28, 6), organiserPays(200, 500, null, false)),
    withTravel(
      regulation({ ...div(4, d!, 'Série D'), refill: 'ranking' }, [
        gruposPhase('grupos', 16, w('04-04', '06-14', [6, 0]), { draw: 'regional' }),
        // Round of 64 to the quarter-finals; the last four (semi-finalists) go up.
        knockoutPhase('mata-mata', 'mata-mata', w('06-20', '08-16', [6, 0]), {
          entrants: [{ from: 'phase', phaseId: 'grupos', positions: [1, 4] }],
          survivors: 4,
          outcomes: [{ kind: 'promotion', target: 'div-3', positions: [1, 4] }],
        }),
        // The four quarter-final losers play off for two more places.
        knockoutPhase('repescagem', 'mata-mata', w('08-26', '09-02', [3, 4]), {
          entrants: [{ from: 'phase', phaseId: 'mata-mata', positions: [5, 8] }],
          survivors: 2,
          outcomes: [{ kind: 'promotion', target: 'div-3', positions: [1, 2] }],
        }),
        knockoutPhase('final', 'final', w('08-22', '09-13', [6, 0]), {
          entrants: [{ from: 'phase', phaseId: 'mata-mata', positions: [1, 4] }],
          outcomes: [{ kind: 'title', positions: [1, 1] }],
        }),
      ]),
      organiserPays(200, 700, 2, false),
    ),
  ];
}
