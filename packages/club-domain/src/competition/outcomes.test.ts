import { describe, expect, it } from 'vitest';
import {
  gruposPhase,
  knockoutPhase,
  ligaPhase,
  regulation,
  dateWindow,
} from '../generate/competitions';
import type { Row } from './league';
import { applyOutcomes, regulationsFor, type PhaseResult } from './outcomes';
import type { Competition } from './schema';

const W = dateWindow(2026, '02-01', '11-30');
const ids = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}${i + 1}`);
const row = (clubId: string): Row => ({
  clubId,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  points: 0,
  yellow: 0,
  red: 0,
});
const rules = { points: { win: 3, draw: 1, loss: 0 }, tieBreakers: [], seed: 1 };
/** A finished phase whose single table is the clubs in the given order. */
const done = (...tables: string[][]): PhaseResult => ({
  tables: tables.map((t) => t.map(row)),
  rules,
});

const A = regulation({ id: 'a', name: 'A', season: 2026, tier: 1, clubIds: ids('a', 4) }, [
  ligaPhase('liga', W, {
    outcomes: [
      { kind: 'title', positions: [1, 1] },
      { kind: 'relegation', target: 'b', positions: [4, 4] },
    ],
  }),
]);
const B = regulation({ id: 'b', name: 'B', season: 2026, tier: 2, clubIds: ids('b', 4) }, [
  ligaPhase('liga', W, { outcomes: [{ kind: 'relegation', target: 'c', positions: [4, 4] }] }),
  knockoutPhase('playoff', 'final', W, {
    entrants: [{ from: 'phase', phaseId: 'liga', positions: [1, 2] }],
    outcomes: [{ kind: 'promotion', target: 'a', positions: [1, 1] }],
  }),
]);
// C grows from 4 to 6 next season: it sends 1 down and D sends 3 up.
const C = regulation({ id: 'c', name: 'C', season: 2026, tier: 3, clubIds: ids('c', 4) }, [
  ligaPhase('liga', W, {
    outcomes: [
      { kind: 'promotion', target: 'b', positions: [1, 1] },
      { kind: 'relegation', target: 'd', positions: [4, 4] },
    ],
  }),
]);
const D = regulation(
  { id: 'd', name: 'D', season: 2026, tier: 4, clubIds: ids('d', 8), refill: 'ranking' },
  [
    gruposPhase('grupos', 2, W, {
      outcomes: [{ kind: 'promotion', target: 'c', positions: [1, 1] }],
    }),
    knockoutPhase('final', 'final', W, {
      entrants: [{ from: 'phase', phaseId: 'grupos', positions: [2, 2] }],
      outcomes: [{ kind: 'promotion', target: 'c', positions: [1, 1] }],
    }),
  ],
);
// A cup whose champion gets a continental place; the place cascades.
const CUP = regulation(
  { id: 'cup', name: 'Copa', season: 2026, clubIds: [...ids('a', 2), ...ids('b', 2)] },
  [
    knockoutPhase('final', 'final', W, {
      outcomes: [
        { kind: 'title', positions: [1, 1] },
        {
          kind: 'slot',
          target: 'conti',
          targetPhaseId: 'grupos',
          count: 1,
          candidates: [
            { phaseId: 'final', positions: [1, 2] },
            { competitionId: 'a', phaseId: 'liga', positions: [1, 4] },
          ],
          excludeRelegated: true,
        },
      ],
    }),
  ],
);
// League places to the continental cup, given before the cup's (more beneficial first).
const A_SLOT = {
  ...A,
  phases: [
    {
      ...A.phases[0]!,
      outcomes: [
        ...A.phases[0]!.outcomes,
        {
          kind: 'slot' as const,
          target: 'conti',
          targetPhaseId: 'grupos',
          count: 1,
          candidates: [{ phaseId: 'liga', positions: [1, 4] as [number, number] }],
          excludeRelegated: false,
        },
      ],
    },
  ],
};
const CONTI = regulation({ id: 'conti', name: 'Conti', season: 2026, clubIds: ['x1', 'x2'] }, [
  knockoutPhase('grupos', 'final', W, { entrants: [{ from: 'slots' }] }),
]);
const next = (c: Competition, size = c.size) => ({ ...c, season: 2027, clubIds: [], size });

const results = {
  a: { liga: done(['a1', 'a2', 'a3', 'a4']) },
  b: { liga: done(['b1', 'b2', 'b3', 'b4']), playoff: done(['b2', 'b1']) },
  c: { liga: done(['c1', 'c2', 'c3', 'c4']) },
  d: {
    grupos: done(['d1', 'd2', 'd3', 'd4'], ['d5', 'd6', 'd7', 'd8']),
    final: done(['d6', 'd2']),
  },
  cup: { final: done(['a1', 'b1']) },
  conti: { grupos: done(['x1', 'x2']) },
};

describe('MC-172 outcomes', () => {
  const regs2027 = [next(A), next(B), next(C, 6), next(D), next(CUP), next(CONTI)];
  const members = {
    a: ids('a', 4),
    b: ids('b', 4),
    c: ids('c', 4),
    d: ids('d', 8),
    cup: CUP.clubIds,
    conti: ['x1', 'x2'],
  };
  const out = applyOutcomes({
    competitions: [A_SLOT, B, C, D, CUP, CONTI],
    members,
    results,
    next: regs2027,
    ranking: ['r1', 'r2', 'r3', 'd1'],
  });

  it('promotion and relegation swap clubs between divisions', () => {
    expect(out.members.a).toEqual(['a1', 'a2', 'a3', 'b2']);
    expect(out.members.b).toEqual(['b1', 'b3', 'a4', 'c1']);
    // C: 4 - 1 up - 1 down + 1 from B + 3 from D = 6 (the transition rule of the pack).
    expect(out.members.c).toEqual(['c2', 'c3', 'b4', 'd1', 'd5', 'd6']);
    // D: 8 - 3 up + 1 from C = 6, refilled to 8 from the ranking (d1 already placed is skipped).
    expect(out.members.d).toEqual(['d2', 'd3', 'd4', 'd7', 'd8', 'c4', 'r1', 'r2']);
  });

  it('every place is filled once: no club in two divisions', () => {
    const divisions = ['a', 'b', 'c', 'd'].flatMap((k) => out.members[k]!);
    expect(new Set(divisions).size).toBe(divisions.length);
    expect(divisions).toHaveLength(4 + 4 + 6 + 8);
  });

  it('titles and slot cascade: champion already in, the place passes on', () => {
    expect(out.titles).toEqual([
      { competitionId: 'a', clubId: 'a1' },
      { competitionId: 'cup', clubId: 'a1' },
    ]);
    // a1 took the league place; the cup place skips a1 (cup champion), goes to b1.
    expect(out.slots).toEqual({ conti: { grupos: ['a1', 'b1'] } });
  });

  it('a relegated club loses its place when the rule says so', () => {
    const cupWonByRelegated = { ...results, cup: { final: done(['a4', 'b1']) } };
    const o = applyOutcomes({
      competitions: [A, B, C, D, CUP, CONTI],
      members,
      results: cupWonByRelegated,
      next: regs2027,
      ranking: ['r1', 'r2', 'r3'],
    });
    expect(o.slots.conti!.grupos).toEqual(['b1']);
  });

  it('size mismatch without a refill rule is an error', () => {
    expect(() =>
      applyOutcomes({
        competitions: [A, B, C, D, CUP, CONTI],
        members,
        results,
        next: [next(A), next(B), next(C, 5), next(D), next(CUP), next(CONTI)],
        ranking: [],
      }),
    ).toThrow('c: 6 members, regulation says 5');
  });
});

describe('MC-172 regulation of a season', () => {
  it('uses the season when the pack has it, else repeats the last known', () => {
    const all = [A, next(A), B];
    expect(regulationsFor(all, 2027).map((c) => [c.id, c.season])).toEqual([
      ['a', 2027],
      ['b', 2027],
    ]);
    expect(regulationsFor(all, 2028).find((c) => c.id === 'b')!.clubIds).toEqual([]);
  });
});

describe('MC-172 Série C from 20 to 24 (05 §8, 2027)', () => {
  it('C sends 2 down, D sends 6 up, D refills from the ranking', () => {
    const c = regulation({ id: 'c', name: 'C', season: 2026, tier: 3, clubIds: ids('c', 20) }, [
      ligaPhase('liga', W, {
        outcomes: [{ kind: 'relegation', target: 'd', positions: [19, 20] }],
      }),
    ]);
    const d = regulation(
      { id: 'd', name: 'D', season: 2026, tier: 4, clubIds: ids('d', 96), refill: 'ranking' },
      [
        gruposPhase('grupos', 16, W, { outcomes: [] }),
        knockoutPhase('mata-mata', 'mata-mata', W, {
          entrants: [{ from: 'phase', phaseId: 'grupos', positions: [1, 4] }],
          survivors: 6,
          outcomes: [{ kind: 'promotion', target: 'c', positions: [1, 6] }],
        }),
      ],
    );
    const groups = Array.from({ length: 16 }, (_, g) => ids('d', 96).slice(g * 6, g * 6 + 6));
    const o = applyOutcomes({
      competitions: [c, d],
      members: { c: ids('c', 20), d: ids('d', 96) },
      results: {
        c: { liga: done(ids('c', 20)) },
        d: { grupos: done(...groups), 'mata-mata': done(ids('d', 6)) },
      },
      next: [next(c, 24), next(d)],
      ranking: ids('r', 10),
    });
    expect(o.members.c).toHaveLength(24);
    expect(o.members.d).toHaveLength(96);
    expect(o.members.d!.slice(-4)).toEqual(['r1', 'r2', 'r3', 'r4']);
    expect(new Set([...o.members.c!, ...o.members.d!]).size).toBe(120);
  });
});
