/**
 * Fictional development packs (MC-014; 03 §1.5): `br-dev-mini` (eight clubs,
 * cut 0.5 and quick tests) and `br-dev-1` (the four divisions at real sizes,
 * every phase kind). Same seed, same bytes.
 */
import { between, fork, next, pick, rngFrom, type Rng } from '@decabeca/match-engine';
import { sha256Hex } from '../lib/sha256';
import { DEPARTMENTS, PackSchema, type Pack, type PackClub } from '../pack/schema';
import { devDivisions, miniCup } from './competitions';
import { generateSquad } from './player';
import { CITIES, CLUB_PREFIXES, FIRST_NAMES, LAST_NAMES, NICKNAMES, devCities } from './names';

const SEASON = 2026;
const hex = (r: Rng) =>
  '#' + Array.from({ length: 3 }, () => (48 + pick(r, 176)).toString(16).padStart(2, '0')).join('');

const pad = (i: number, width: number) => String(i + 1).padStart(width, '0');

/**
 * Club money by squad strength (04 §4, table "Milhões de reais por temporada"): anchors near the
 * middle of each division's range, linear in between. Bands of the dev pack: Primeira 60–80,
 * Segunda 52–68, Terceira 44–60, Quarta 30–52. PARÂMETRO: the lower divisions have no solid
 * source (04 §1); these are game proposals, kept close to the research's orders of magnitude.
 */
const ECONOMY: {
  strength: number;
  /** Monthly payroll of the squad. */
  payroll: number;
  sponsors: number;
  capacity: number;
  fans: number;
}[] = [
  { strength: 30, payroll: 30_000, sponsors: 100_000, capacity: 3_000, fans: 15_000 },
  { strength: 44, payroll: 90_000, sponsors: 1_000_000, capacity: 8_000, fans: 60_000 },
  { strength: 52, payroll: 300_000, sponsors: 1_500_000, capacity: 15_000, fans: 150_000 },
  { strength: 60, payroll: 2_500_000, sponsors: 6_000_000, capacity: 25_000, fans: 400_000 },
  { strength: 68, payroll: 6_000_000, sponsors: 40_000_000, capacity: 40_000, fans: 1_500_000 },
  { strength: 80, payroll: 30_000_000, sponsors: 200_000_000, capacity: 70_000, fans: 15_000_000 },
];

export function economy(strength: number) {
  const s = Math.max(ECONOMY[0]!.strength, Math.min(ECONOMY.at(-1)!.strength, strength));
  let k = 0;
  while (k < ECONOMY.length - 2 && ECONOMY[k + 1]!.strength < s) k++;
  const [a, b] = [ECONOMY[k]!, ECONOMY[k + 1]!];
  const t = (s - a.strength) / (b.strength - a.strength);
  const at = (key: 'payroll' | 'sponsors' | 'capacity' | 'fans') =>
    Math.round(a[key] + (b[key] - a[key]) * t);
  return {
    payroll: at('payroll'),
    sponsors: at('sponsors'),
    capacity: at('capacity'),
    fans: at('fans'),
  };
}

function club(r: Rng, i: number, strength: number, city: string, width: number): PackClub {
  const money = economy(strength);
  const lvl = Math.max(1, Math.min(5, Math.round((strength - 35) / 10)));
  const v = () => Math.round(between(r, 20, 80));
  return {
    id: `club${pad(i, width)}`,
    name: `${CLUB_PREFIXES[pick(r, CLUB_PREFIXES.length)]} ${city}`,
    shortName: city
      .split(' ')
      .filter((w) => w.length > 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .padEnd(3, 'C')
      .slice(0, 3),
    cityId: `city${pad(i, width)}`,
    colours: [hex(r), hex(r)],
    stadium: {
      name: `Estádio ${LAST_NAMES[pick(r, LAST_NAMES.length)]}`,
      capacity: Math.round(money.capacity * between(r, 0.8, 1.2)),
      pitch: lvl >= 3 ? 'good' : 'average',
      drainage: lvl,
      arrangement: next(r) < 0.7 ? 'owned' : 'municipal',
    },
    reputation: Math.round(strength - 10 + between(r, -5, 5)),
    // About three months of payroll in the bank, and a debt of up to a year of it.
    initialCash: money.payroll * 3,
    initialDebt: Math.round(between(r, 0, money.payroll * 12)),
    facilities: { training: lvl, youth: lvl, medical: lvl },
    departments: Object.fromEntries(
      DEPARTMENTS.map((d) => [d, Math.max(1, Math.min(5, lvl + pick(r, 3) - 1))]),
    ) as PackClub['departments'],
    profile: {
      playingStyle: {
        possession: v(),
        verticality: v(),
        pressing: v(),
        block: v(),
        width: v(),
        tempo: v(),
        risk: v(),
      },
      market: { readyVsYoung: v(), regionalVsNational: v() },
      youthPolicy: v(),
      financialRisk: v(),
      patience: v(),
      origin: 'generated',
      confidence: 'high',
    },
    fans: {
      size: Math.round(money.fans * between(r, 0.7, 1.3)),
      loyalty: v(),
      demand: v(),
      patience: v(),
      priceSensitivity: v(),
      localIdentity: v(),
      youthPride: v(),
      ambition: v(),
    },
    sponsors: [
      {
        name: `${LAST_NAMES[pick(r, LAST_NAMES.length)]} Alimentos`,
        annual: money.sponsors,
        until: `${SEASON + 1}-12-31`,
      },
    ],
    rivals: [],
  };
}

type World = Pick<Pack, 'clubs' | 'players' | 'staff' | 'assignments' | 'governance' | 'cities'>;

/**
 * Clubs with squad, head coach, governance and city. `goal` is the board's
 * target position (06 §2.8). Same seed and list, same world.
 */
function world(
  root: Rng,
  list: { strength: number; city: readonly [string, string, number]; goal: number }[],
): World {
  const width = list.length > 99 ? 3 : 2;
  const w: World = {
    clubs: [],
    players: [],
    staff: [],
    assignments: [],
    governance: [],
    cities: [],
  };
  list.forEach(({ strength, city, goal }, i) => {
    const r = fork(root, `club:${i}`);
    const c = club(r, i, strength, city[0], width);
    w.clubs.push(c);
    // Wages keep their spread inside the squad but add up to the division's payroll (04 §4).
    const squad = generateSquad(root, { clubId: c.id, strength, season: SEASON });
    const payroll = economy(strength).payroll;
    const total = squad.reduce((sum, p) => sum + (p.contract?.wage ?? 0), 0);
    for (const p of squad)
      if (p.contract && total > 0)
        p.contract.wage = Math.max(
          1_000,
          Math.round((p.contract.wage * payroll) / total / 10) * 10,
        );
    w.players.push(...squad);
    const coachId = `${c.id}-s01`;
    w.staff.push({
      id: coachId,
      name: `${FIRST_NAMES[pick(r, FIRST_NAMES.length)]} ${LAST_NAMES[pick(r, LAST_NAMES.length)]}`,
      birthDate: `${SEASON - 40 - pick(r, 20)}-06-15`,
      nationality: 'BR',
      roles: ['headCoach'],
      specialties: [],
      attributes: {
        tactics: 6 + pick(r, 12),
        gameReading: 6 + pick(r, 12),
        manManagement: 6 + pick(r, 12),
        motivation: 6 + pick(r, 12),
      },
      licence: strength > 60 ? 'Pro' : 'A',
      experienceYears: 3 + pick(r, 20),
      reputation: Math.round(strength - 5),
      ties: [],
      field: { identity: { origin: 'generated', confidence: 'high' } },
    });
    w.assignments.push({
      staffId: coachId,
      clubId: c.id,
      posts: ['headCoach'],
      load: 'full',
      group: 'club',
      contract: {
        wage: Math.round(economy(strength).payroll * 0.08),
        until: `${SEASON + 1}-12-31`,
        releaseFee: strength * 20_000,
      },
    });
    const model = next(r) < 0.7 ? 'association' : 'ownedSaf';
    w.governance.push({
      clubId: c.id,
      model,
      // Owner profile only for SAFs (06 §5.1).
      ownerProfile:
        model === 'association' ? null : (['builder', 'speculator', 'passionate'] as const)[i % 3]!,
      electionEverySeasons: model === 'association' ? 3 : null,
      authority: {
        transferCap: economy(strength).payroll * 4,
        wageCap: Math.round(economy(strength).payroll / 10),
      },
      goals: [{ kind: 'position', value: goal }],
    });
    const rc = fork(root, `city:${i}`);
    w.cities.push({
      id: `city${pad(i, width)}`,
      name: city[0],
      state: city[1],
      population: city[2],
      income: 1500 + pick(rc, 2500),
      altitudeM: pick(rc, 900),
      lat: -5 - pick(rc, 25),
      lon: -38 - pick(rc, 20),
      climate: Array.from({ length: 12 }, (_, m) => ({
        rainMm: 40 + pick(rc, 200),
        tempC: 18 + ((m * 7) % 10),
        humidity: 55 + pick(rc, 35),
      })),
    });
  });
  return w;
}

/** `br-dev-mini`: eight clubs from strength 46 to 74, so favourites and underdogs exist. */
export function generateMiniPack(seed = 20261113): Pack {
  const n = 8;
  const w = world(
    rngFrom(seed),
    Array.from({ length: n }, (_, i) => ({
      strength: 46 + i * 4,
      city: CITIES[i]!,
      goal: Math.max(1, n - i - 1),
    })),
  );
  return finish({
    id: 'br-dev-mini',
    competitions: [miniCup(w.clubs.map((c) => c.id))],
    ...w,
  });
}

function finish(p: Pick<Pack, 'id' | 'competitions'> & World): Pack {
  const pack: Pack = {
    version: 1,
    kind: 'fictional',
    region: 'BR',
    season: SEASON,
    createdAt: `${SEASON}-01-01T00:00:00Z`,
    checksum: '0'.repeat(64),
    manifest: [],
    academies: [],
    youthCompetitions: [],
    names: { first: FIRST_NAMES, last: LAST_NAMES, nicknames: NICKNAMES },
    ...p,
  };
  // Checksum of the parsed pack: parsing fixes the key order.
  const parsed = PackSchema.parse(pack);
  parsed.checksum = packChecksum(parsed);
  return parsed;
}

/**
 * `br-dev-1`: the four national divisions at their real sizes (05 §8: 20, 20,
 * 20, 96 clubs), weaker going down, with every phase kind. Cities are
 * invented; the Série D clubs spread over the states so regional groups work.
 */
export function generateDevPack(seed = 20261116): Pack {
  const sizes = [20, 20, 20, 96];
  // Strength bands per division (PARÂMETRO, overlap on purpose: zebras exist).
  const bands: [number, number][] = [
    [60, 80],
    [52, 68],
    [44, 60],
    [30, 52],
  ];
  const list: Parameters<typeof world>[1] = [];
  const cities = devCities(sizes.reduce((a, b) => a + b));
  sizes.forEach((n, d) => {
    const [lo, hi] = bands[d]!;
    for (let i = 0; i < n; i++)
      list.push({
        strength: Math.round(hi - ((hi - lo) * i) / (n - 1)),
        city: cities[list.length]!,
        goal: Math.min(n, i + 3),
      });
  });
  const w = world(rngFrom(seed), list);
  let k = 0;
  const divisions = sizes.map((n) => w.clubs.slice(k, (k += n)).map((c) => c.id));
  return finish({ id: 'br-dev-1', competitions: devDivisions(SEASON, divisions), ...w });
}

/** sha256 of the pack's JSON with the checksum field blanked. */
export const packChecksum = (pack: Pack) => sha256Hex(JSON.stringify({ ...pack, checksum: '' }));
