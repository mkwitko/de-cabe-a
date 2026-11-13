import { describe, expect, it } from 'vitest';
import { ATTRIBUTES } from '@decabeca/match-engine';
import { DEPARTMENTS, PackSchema, type Pack } from './schema';

const sha = 'a'.repeat(64);
const city = {
  id: 'c1',
  name: 'Vila Nova do Sul',
  state: 'RS',
  population: 120_000,
  income: 2_400,
  altitudeM: 40,
  lat: -30,
  lon: -51,
  climate: Array.from({ length: 12 }, () => ({ rainMm: 100, tempC: 20, humidity: 70 })),
};
const club = (id: string) => ({
  id,
  name: `Clube ${id}`,
  shortName: id.toUpperCase(),
  cityId: 'c1',
  colours: ['#ffcc00', '#003366'] as [string, string],
  stadium: {
    name: 'Estádio',
    capacity: 12_000,
    pitch: 'good' as const,
    drainage: 3,
    arrangement: 'owned' as const,
  },
  reputation: 40,
  initialCash: 1_000_000,
  initialDebt: 0,
  facilities: { training: 2, youth: 2, medical: 2 },
  departments: Object.fromEntries(
    DEPARTMENTS.map((d) => [d, 2]),
  ) as Pack['clubs'][number]['departments'],
  profile: {
    playingStyle: {
      possession: 50,
      verticality: 50,
      pressing: 50,
      block: 50,
      width: 50,
      tempo: 50,
      risk: 50,
    },
    market: { readyVsYoung: 50, regionalVsNational: 50 },
    youthPolicy: 50,
    financialRisk: 50,
    patience: 50,
    origin: 'generated' as const,
    confidence: 'low' as const,
  },
  fans: {
    size: 50_000,
    loyalty: 50,
    demand: 50,
    patience: 50,
    priceSensitivity: 50,
    localIdentity: 50,
    youthPride: 50,
    ambition: 50,
  },
  sponsors: [],
  rivals: [],
});
const player = (id: string, clubId: string | null) => ({
  id,
  name: `Jogador ${id}`,
  birthDate: '2000-01-01',
  nationality: 'BR',
  foot: 'right' as const,
  positions: [{ position: 'CM' as const, level: 3 }],
  attributes: Object.fromEntries(
    ATTRIBUTES.map((a) => [a, 50]),
  ) as Pack['players'][number]['attributes'],
  potential: {
    ceiling: { technical: 70, mental: 70, physical: 70 },
    learning: 10,
    physicalCurve: 'normal' as const,
    peakAge: 27,
  },
  personality: {
    professionalism: 10,
    ambition: 10,
    loyalty: 10,
    temperament: 10,
    resilience: 10,
    sociability: 10,
  },
  hidden: {
    consistency: 10,
    bigMatches: 10,
    injuryProneness: 10,
    adaptability: 10,
    versatility: 10,
  },
  traits: [],
  clubId,
  field: { identity: { origin: 'generated' as const, confidence: 'high' as const } },
});

function pack(): Pack {
  return {
    id: 'br-test',
    version: 1,
    kind: 'fictional',
    region: 'BR',
    season: 2026,
    createdAt: '2026-11-13T00:00:00Z',
    checksum: sha,
    manifest: [],
    competitions: [
      {
        id: 'l1',
        name: 'Liga',
        type: 'league',
        tier: 1,
        season: 2026,
        clubIds: ['a', 'b'],
        phases: [],
      },
    ],
    clubs: [club('a'), club('b')],
    players: [player('p1', 'a'), player('p2', 'b')],
    staff: [
      {
        id: 's1',
        name: 'Técnico',
        birthDate: '1970-01-01',
        nationality: 'BR',
        roles: ['headCoach'],
        specialties: [],
        attributes: { tactics: 14 },
        experienceYears: 10,
        reputation: 40,
        ties: [],
        field: {},
      },
    ],
    assignments: [
      {
        staffId: 's1',
        clubId: 'a',
        posts: ['headCoach'],
        load: 'full',
        group: 'club',
        contract: { wage: 50_000, until: '2027-12-31', releaseFee: null },
      },
    ],
    governance: [
      {
        clubId: 'a',
        model: 'association',
        ownerProfile: null,
        electionEverySeasons: 3,
        authority: { transferCap: 500_000, wageCap: 80_000 },
        goals: [],
      },
    ],
    cities: [city],
    academies: [],
    youthCompetitions: [],
    names: { first: ['Ana'], last: ['Silva'], nicknames: [] },
  };
}

const paths = (p: unknown) => {
  const r = PackSchema.safeParse(p);
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
};

describe('MC-011 pack schema', () => {
  it('a minimal valid pack parses', () => {
    expect(paths(pack())).toEqual([]);
  });

  it('unknown field at the root', () => {
    expect(paths({ ...pack(), cash: 1 })).toEqual(['']);
  });

  it('attribute out of range', () => {
    const p = pack();
    p.players[0]!.attributes.pace = 100;
    expect(paths(p)).toEqual(['players.0.attributes.pace']);
  });

  it('player in an unknown club', () => {
    const p = pack();
    p.players[1]!.clubId = 'zz';
    expect(paths(p)).toEqual(['players.1.clubId']);
  });

  it('duplicate player id', () => {
    const p = pack();
    p.players[1]!.id = 'p1';
    expect(paths(p)).toEqual(['players.1.id']);
  });

  it('assignment to unknown staff', () => {
    const p = pack();
    p.assignments[0]!.staffId = 'nobody';
    expect(paths(p)).toEqual(['assignments.0.staffId']);
  });

  it('real pack with a generated player in a club (03 §1.6)', () => {
    expect(paths({ ...pack(), kind: 'real' })).toEqual([
      'players.0.field.identity',
      'players.1.field.identity',
    ]);
    const free = pack();
    free.kind = 'real';
    free.players.forEach((pl) => (pl.clubId = null));
    expect(paths(free)).toEqual([]);
  });

  it('competition with an unknown club', () => {
    const p = pack();
    p.competitions[0]!.clubIds.push('zz');
    expect(paths(p)).toEqual(['competitions.0.clubIds.2']);
  });
});
