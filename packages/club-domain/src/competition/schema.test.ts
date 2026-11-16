import { describe, expect, it } from 'vitest';
import { CompetitionSchema, type Competition, type Phase } from './schema';

// Builders for the 05 §8 formats. Only the shape matters here: every real
// format must parse with typed fields, none of them free text.
const dates = { start: '2026-02-01', end: '2026-12-06', weekdays: [0, 3] };
const pts = { win: 3, draw: 1, loss: 0 };
const cbf = ['wins', 'goalDifference', 'goalsFor', 'headToHead', 'redCards', 'yellowCards', 'draw'];

const liga = (id: string, legs: 1 | 2, extra: Partial<Phase> = {}) =>
  ({
    kind: 'liga',
    id,
    entrants: [{ from: 'members' }],
    dates,
    outcomes: [],
    legs,
    points: pts,
    tieBreakers: cbf,
    ...extra,
  }) as Phase;
const grupos = (id: string, groups: number, extra: Partial<Phase> = {}) =>
  ({
    kind: 'grupos',
    id,
    entrants: [{ from: 'members' }],
    dates,
    outcomes: [],
    legs: 2,
    points: pts,
    tieBreakers: cbf.filter((b) => b !== 'headToHead'),
    groups,
    draw: 'regional',
    opponents: 'own',
    ...extra,
  }) as Phase;
const ko = (id: string, from: string, legs: 1 | 2, extra: Partial<Phase> = {}) =>
  ({
    kind: 'mata-mata',
    id,
    entrants: [{ from: 'phase', phaseId: from, positions: [1, 1] }],
    dates,
    outcomes: [],
    legs,
    pairing: 'seeded',
    host: 'betterCampaign',
    survivors: 1,
    tieBreakers: ['penalties'],
    ...extra,
  }) as Phase;

function comp(id: string, size: number, phases: Phase[], extra: Partial<Competition> = {}) {
  return {
    id,
    name: id,
    season: 2026,
    scope: 'nacional',
    tier: null,
    category: 'profissional',
    priority: 1,
    size,
    clubIds: [],
    registration: {
      maxSquad: 50,
      changes: 8,
      maxForeign: null,
      ageLimit: null,
      transferLockAfterMatches: 12,
      windows: [{ start: '2026-01-04', end: '2026-03-02' }],
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
    phases,
    ...extra,
  };
}

const sel = (a: number, b: number) => ({ positions: [a, b] as [number, number] });

// 05 §8, competition by competition.
const REAL: Record<string, unknown> = {
  'Série A': comp('serie-a', 20, [
    liga('liga', 2, {
      outcomes: [
        { kind: 'title', ...sel(1, 1) },
        { kind: 'relegation', target: 'serie-b', ...sel(17, 20) },
      ],
    }),
  ]),
  'Série B': comp('serie-b', 20, [
    liga('liga', 2, {
      outcomes: [
        { kind: 'promotion', target: 'serie-a', ...sel(1, 2) },
        { kind: 'relegation', target: 'serie-c', ...sel(17, 20) },
      ],
    }),
    // 3rd v 6th, 4th v 5th, two legs; the two winners go up.
    ko('playoff', 'liga', 2, {
      entrants: [{ from: 'phase', phaseId: 'liga', ...sel(3, 6) }],
      survivors: 2,
      tieBreakers: ['betterCampaign'],
      outcomes: [{ kind: 'promotion', target: 'serie-a', ...sel(1, 2) }],
    }),
  ]),
  'Série C': comp('serie-c', 20, [
    liga('liga', 1, {
      tieBreakers: cbf.filter((b) => b !== 'headToHead') as never,
      outcomes: [{ kind: 'relegation', target: 'serie-d', ...sel(19, 20) }],
    }),
    grupos('quadrangular', 2, {
      entrants: [{ from: 'phase', phaseId: 'liga', ...sel(1, 8) }],
      draw: 'pots',
      outcomes: [{ kind: 'promotion', target: 'serie-b', ...sel(1, 2) }],
    }),
    {
      ...ko('final', 'quadrangular', 2),
      kind: 'final',
      outcomes: [{ kind: 'title', ...sel(1, 1) }],
    } as Phase,
  ]),
  // 2027: 24 clubs; the transition is the 2026 Série D promoting six.
  'Série C 2027': comp('serie-c', 24, [liga('liga', 1)], { season: 2027 }),
  'Série D': comp('serie-d', 96, [
    grupos('grupos', 16, { outcomes: [] }),
    ko('mata-mata', 'grupos', 2, {
      entrants: [{ from: 'phase', phaseId: 'grupos', ...sel(1, 4) }],
      survivors: 2,
      outcomes: [{ kind: 'promotion', target: 'serie-c', ...sel(1, 2) }],
    }),
    {
      ...ko('final', 'mata-mata', 2),
      kind: 'final',
      entrants: [{ from: 'phase', phaseId: 'mata-mata', ...sel(1, 2) }],
      outcomes: [{ kind: 'title', ...sel(1, 1) }],
    } as Phase,
  ]),
  'Copa do Brasil': comp(
    'copa-do-brasil',
    126,
    [
      ko('f1', 'x', 1, {
        entrants: [{ from: 'ranking', count: 80 }],
        pairing: 'draw',
        survivors: 40,
      }),
      ko('f2', 'f1', 1, {
        entrants: [{ from: 'phase', phaseId: 'f1', ...sel(1, 40) }],
        survivors: 20,
      }),
      // 3rd phase: regional cup and Série C/D champions join.
      ko('f3', 'f2', 1, {
        entrants: [
          { from: 'phase', phaseId: 'f2', ...sel(1, 20) },
          {
            from: 'competition',
            competitionId: 'copa-nordeste',
            season: 'same',
            phaseId: 'final',
            ...sel(1, 1),
          },
          {
            from: 'competition',
            competitionId: 'serie-c',
            season: 'previous',
            phaseId: 'final',
            ...sel(1, 1),
          },
        ],
        survivors: 16,
      }),
      ko('f4', 'f3', 1, {
        entrants: [{ from: 'phase', phaseId: 'f3', ...sel(1, 16) }],
        survivors: 8,
      }),
      // 5th phase: Série A clubs join.
      ko('f5', 'f4', 2, {
        entrants: [
          { from: 'phase', phaseId: 'f4', ...sel(1, 8) },
          {
            from: 'competition',
            competitionId: 'serie-a',
            season: 'previous',
            phaseId: 'liga',
            ...sel(1, 16),
          },
        ],
        pairing: 'draw',
        survivors: 16,
      }),
      ko('f6', 'f5', 2, {
        entrants: [{ from: 'phase', phaseId: 'f5', ...sel(1, 16) }],
        survivors: 8,
      }),
      ko('f7', 'f6', 2, {
        entrants: [{ from: 'phase', phaseId: 'f6', ...sel(1, 8) }],
        survivors: 4,
      }),
      ko('f8', 'f7', 2, {
        entrants: [{ from: 'phase', phaseId: 'f7', ...sel(1, 4) }],
        survivors: 2,
      }),
      {
        ...ko('final', 'f8', 1, { entrants: [{ from: 'phase', phaseId: 'f8', ...sel(1, 2) }] }),
        kind: 'final',
        host: 'draw',
        outcomes: [
          { kind: 'title', ...sel(1, 1) },
          // Champion to the Libertadores groups; if already in, the place goes to the
          // runner-up, then back to the league.
          {
            kind: 'slot',
            target: 'libertadores',
            targetPhaseId: 'grupos',
            count: 1,
            candidates: [
              { phaseId: 'final', ...sel(1, 2) },
              { competitionId: 'serie-a', phaseId: 'liga', ...sel(1, 20) },
            ],
            excludeRelegated: false,
          },
        ],
      } as Phase,
    ],
    { registration: { ...comp('x', 2, []).registration, maxSquad: null } },
  ),
  Supercopa: comp('supercopa', 2, [
    {
      ...ko('final', 'x', 1, {
        entrants: [
          {
            from: 'competition',
            competitionId: 'serie-a',
            season: 'previous',
            phaseId: 'liga',
            ...sel(1, 1),
          },
          {
            from: 'competition',
            competitionId: 'copa-do-brasil',
            season: 'previous',
            phaseId: 'final',
            ...sel(1, 1),
          },
        ],
        host: 'fixed',
      }),
      kind: 'final',
    } as Phase,
  ]),
  'Copa do Nordeste': comp(
    'copa-nordeste',
    20,
    [
      grupos('grupos', 4, { legs: 1 }),
      ko('quartas', 'grupos', 1, {
        entrants: [{ from: 'phase', phaseId: 'grupos', ...sel(1, 2) }],
        survivors: 4,
      }),
      ko('semi', 'quartas', 2, {
        entrants: [{ from: 'phase', phaseId: 'quartas', ...sel(1, 4) }],
        survivors: 2,
      }),
      {
        ...ko('final', 'semi', 2, { entrants: [{ from: 'phase', phaseId: 'semi', ...sel(1, 2) }] }),
        kind: 'final',
      } as Phase,
    ],
    { scope: 'regional' },
  ),
  'Copa Verde': comp(
    'copa-verde',
    24,
    [
      grupos('grupos', 4),
      ko('mata-mata', 'grupos', 2, {
        entrants: [{ from: 'phase', phaseId: 'grupos', ...sel(1, 2) }],
      }),
    ],
    { scope: 'regional' },
  ),
  'Copa Sul-Sudeste': comp(
    'copa-sul-sudeste',
    12,
    [
      grupos('grupos', 2, { legs: 1, opponents: 'other' }),
      ko('semi', 'grupos', 2, {
        entrants: [{ from: 'phase', phaseId: 'grupos', ...sel(1, 2) }],
        survivors: 2,
      }),
      {
        ...ko('final', 'semi', 2, { entrants: [{ from: 'phase', phaseId: 'semi', ...sel(1, 2) }] }),
        kind: 'final',
      } as Phase,
    ],
    { scope: 'regional' },
  ),
  Libertadores: comp(
    'libertadores',
    47,
    [
      ko('pre1', 'x', 2, { entrants: [{ from: 'ranking', count: 6 }], survivors: 3 }),
      ko('pre2', 'pre1', 2, {
        entrants: [
          { from: 'phase', phaseId: 'pre1', ...sel(1, 3) },
          { from: 'ranking', count: 13 },
        ],
        survivors: 8,
      }),
      ko('pre3', 'pre2', 2, {
        entrants: [{ from: 'phase', phaseId: 'pre2', ...sel(1, 8) }],
        survivors: 4,
      }),
      grupos('grupos', 8, {
        entrants: [
          { from: 'phase', phaseId: 'pre3', ...sel(1, 4) },
          { from: 'ranking', count: 28 },
        ],
        draw: 'pots',
      }),
      ko('oitavas', 'grupos', 2, {
        entrants: [{ from: 'phase', phaseId: 'grupos', ...sel(1, 2) }],
        pairing: 'draw',
        survivors: 2,
      }),
      {
        ...ko('final', 'oitavas', 1, {
          entrants: [{ from: 'phase', phaseId: 'oitavas', ...sel(1, 2) }],
          host: 'fixed',
        }),
        kind: 'final',
      } as Phase,
    ],
    { scope: 'continental' },
  ),
  'Sul-Americana': comp(
    'sul-americana',
    56,
    [
      ko('primeira', 'x', 1, { entrants: [{ from: 'ranking', count: 32 }], survivors: 16 }),
      grupos('grupos', 8, {
        entrants: [
          { from: 'phase', phaseId: 'primeira', ...sel(1, 16) },
          { from: 'ranking', count: 16 },
        ],
        draw: 'pots',
      }),
      // Group runners-up meet the clubs third in the Libertadores groups.
      ko('playoff', 'grupos', 2, {
        entrants: [
          { from: 'phase', phaseId: 'grupos', ...sel(2, 2) },
          {
            from: 'competition',
            competitionId: 'libertadores',
            season: 'same',
            phaseId: 'grupos',
            ...sel(3, 3),
          },
        ],
        survivors: 8,
      }),
      ko('oitavas', 'playoff', 2, {
        entrants: [
          { from: 'phase', phaseId: 'grupos', ...sel(1, 1) },
          { from: 'phase', phaseId: 'playoff', ...sel(1, 8) },
        ],
        survivors: 2,
      }),
      {
        ...ko('final', 'oitavas', 1, {
          entrants: [{ from: 'phase', phaseId: 'oitavas', ...sel(1, 2) }],
          host: 'fixed',
        }),
        kind: 'final',
      } as Phase,
    ],
    { scope: 'continental' },
  ),
  Recopa: comp(
    'recopa',
    2,
    [
      {
        ...ko('final', 'x', 2, {
          entrants: [
            {
              from: 'competition',
              competitionId: 'libertadores',
              season: 'previous',
              phaseId: 'final',
              ...sel(1, 1),
            },
            {
              from: 'competition',
              competitionId: 'sul-americana',
              season: 'previous',
              phaseId: 'final',
              ...sel(1, 1),
            },
          ],
          tieBreakers: ['extraTime', 'penalties'],
        }),
        kind: 'final',
      } as Phase,
    ],
    { scope: 'continental' },
  ),
  'Brasileiro Sub-20': comp(
    'br-sub20',
    20,
    [
      liga('liga', 1, { outcomes: [{ kind: 'relegation', target: 'br-sub20-b', ...sel(18, 20) }] }),
      ko('quartas', 'liga', 2, { entrants: [{ from: 'phase', phaseId: 'liga', ...sel(1, 8) }] }),
    ],
    { category: 'sub-20' },
  ),
  'Copa São Paulo': comp(
    'copinha',
    128,
    [
      grupos('grupos', 32, { legs: 1 }),
      ko('mata-mata', 'grupos', 1, {
        entrants: [{ from: 'phase', phaseId: 'grupos', ...sel(1, 2) }],
      }),
    ],
    { category: 'sub-20', scope: 'estadual' },
  ),
};

describe('MC-160 competition as data', () => {
  it.each(Object.entries(REAL))('%s is representable', (_, c) => {
    const r = CompetitionSchema.safeParse(c);
    expect(r.error?.issues).toBeUndefined();
  });

  it('refuses free fields, unknown kinds and phases read before they exist', () => {
    const base = REAL['Série B'] as Competition;
    expect(CompetitionSchema.safeParse({ ...base, notes: 'x' }).success).toBe(false);
    const badKind = { ...base, phases: [{ ...base.phases[0], kind: 'swiss' }] };
    expect(CompetitionSchema.safeParse(badKind).success).toBe(false);
    const reversed = { ...base, phases: [base.phases[1], base.phases[0]] };
    const r = CompetitionSchema.safeParse(reversed);
    expect(r.error?.issues[0]?.message).toBe('phase liga not before');
    const wrongSize = { ...base, clubIds: ['a', 'b'] };
    expect(CompetitionSchema.safeParse(wrongSize).error?.issues[0]?.message).toBe(
      'clubIds differ from size',
    );
  });
});
