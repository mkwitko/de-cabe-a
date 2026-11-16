/**
 * Fictional development packs (MC-014; 03 §1.5): `br-dev-mini` (eight clubs,
 * cut 0.5 and quick tests) and `br-dev-1` (the four divisions at real sizes,
 * every phase kind). Same seed, same bytes.
 */
import { createHash } from 'node:crypto';
import { between, fork, next, pick, rngFrom, type Rng } from '@decabeca/match-engine';
import { DEPARTMENTS, PackSchema, type Pack, type PackClub } from '../pack/schema';
import { devDivisions, miniCup } from './competitions';
import { generateSquad } from './player';
import { CITIES, CLUB_PREFIXES, FIRST_NAMES, LAST_NAMES, NICKNAMES, devCities } from './names';

const SEASON = 2026;
const hex = (r: Rng) =>
  '#' + Array.from({ length: 3 }, () => (48 + pick(r, 176)).toString(16).padStart(2, '0')).join('');

const pad = (i: number, width: number) => String(i + 1).padStart(width, '0');

function club(r: Rng, i: number, strength: number, city: string, width: number): PackClub {
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
      capacity: Math.round(strength * strength * 6 + between(r, 0, 5000)),
      pitch: lvl >= 3 ? 'good' : 'average',
      drainage: lvl,
      arrangement: next(r) < 0.7 ? 'owned' : 'municipal',
    },
    reputation: Math.round(strength - 10 + between(r, -5, 5)),
    initialCash: Math.round(strength * strength * 2000),
    initialDebt: Math.round(between(r, 0, strength * 200_000)),
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
      size: Math.round(strength * strength * 40),
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
        annual: strength * 40_000,
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
    w.players.push(...generateSquad(root, { clubId: c.id, strength, season: SEASON }));
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
        wage: strength * 3000,
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
      authority: { transferCap: strength * 20_000, wageCap: strength * 2_000 },
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
export const packChecksum = (pack: Pack) =>
  createHash('sha256')
    .update(JSON.stringify({ ...pack, checksum: '' }))
    .digest('hex');
