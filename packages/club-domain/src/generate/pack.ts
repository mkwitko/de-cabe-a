/**
 * Fictional development packs (MC-014, mini version for cut 0.5; 03 §1.5).
 * Same seed, same bytes. Competitions carry no phases until MC-160; the full
 * `br-dev-1` (volumes near the real ones, one competition per phase type) is
 * the rest of MC-014.
 */
import { createHash } from 'node:crypto';
import { between, fork, next, pick, rngFrom, type Rng } from '@decabeca/match-engine';
import { DEPARTMENTS, PackSchema, type Pack, type PackClub } from '../pack/schema';
import { generateSquad } from './player';
import { CITIES, CLUB_PREFIXES, FIRST_NAMES, LAST_NAMES, NICKNAMES } from './names';

const SEASON = 2026;
const hex = (r: Rng) =>
  '#' + Array.from({ length: 3 }, () => (48 + pick(r, 176)).toString(16).padStart(2, '0')).join('');

function club(r: Rng, i: number, strength: number): PackClub {
  const [city] = CITIES[i]!;
  const lvl = Math.max(1, Math.min(5, Math.round((strength - 35) / 10)));
  const v = () => Math.round(between(r, 20, 80));
  return {
    id: `club${String(i + 1).padStart(2, '0')}`,
    name: `${CLUB_PREFIXES[pick(r, CLUB_PREFIXES.length)]} ${city}`,
    shortName: city
      .split(' ')
      .filter((w) => w.length > 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .padEnd(3, 'C')
      .slice(0, 3),
    cityId: `city${String(i + 1).padStart(2, '0')}`,
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

/** `br-dev-mini`: eight clubs from strength 46 to 74, so favourites and underdogs exist. */
export function generateMiniPack(seed = 20261113): Pack {
  const root = rngFrom(seed);
  const n = 8;
  const clubs: PackClub[] = [];
  const players: Pack['players'] = [];
  const staff: Pack['staff'] = [];
  const assignments: Pack['assignments'] = [];
  const governance: Pack['governance'] = [];
  for (let i = 0; i < n; i++) {
    const strength = 46 + i * 4;
    const r = fork(root, `club:${i}`);
    const c = club(r, i, strength);
    clubs.push(c);
    players.push(...generateSquad(root, { clubId: c.id, strength, season: SEASON }));
    const coachId = `${c.id}-s01`;
    staff.push({
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
    assignments.push({
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
    governance.push({
      clubId: c.id,
      model: next(r) < 0.7 ? 'association' : 'ownedSaf',
      ownerProfile: null,
      electionEverySeasons: 3,
      authority: { transferCap: strength * 20_000, wageCap: strength * 2_000 },
      goals: [{ kind: 'position', value: Math.max(1, n - i - 1) }],
    });
  }
  // Owner profile only for SAFs (06 §5.1).
  governance.forEach((g, i) => {
    if (g.model !== 'association') {
      g.ownerProfile = (['builder', 'speculator', 'passionate'] as const)[i % 3]!;
      g.electionEverySeasons = null;
    }
  });
  const cities: Pack['cities'] = CITIES.slice(0, n).map(([name, state, population], i) => {
    const r = fork(root, `city:${i}`);
    return {
      id: `city${String(i + 1).padStart(2, '0')}`,
      name,
      state,
      population,
      income: 1500 + pick(r, 2500),
      altitudeM: pick(r, 900),
      lat: -5 - pick(r, 25),
      lon: -38 - pick(r, 20),
      climate: Array.from({ length: 12 }, (_, m) => ({
        rainMm: 40 + pick(r, 200),
        tempC: 18 + ((m * 7) % 10),
        humidity: 55 + pick(r, 35),
      })),
    };
  });
  const pack: Pack = {
    id: 'br-dev-mini',
    version: 1,
    kind: 'fictional',
    region: 'BR',
    season: SEASON,
    createdAt: `${SEASON}-01-01T00:00:00Z`,
    checksum: '0'.repeat(64),
    manifest: [],
    competitions: [
      {
        id: 'dev-league',
        name: 'Liga de Desenvolvimento',
        type: 'league',
        tier: 1,
        season: SEASON,
        clubIds: clubs.map((c) => c.id),
        phases: [],
      },
    ],
    clubs,
    players,
    staff,
    assignments,
    governance,
    cities,
    academies: [],
    youthCompetitions: [],
    names: { first: FIRST_NAMES, last: LAST_NAMES, nicknames: NICKNAMES },
  };
  pack.checksum = packChecksum(pack);
  return PackSchema.parse(pack);
}

/** sha256 of the pack's JSON with the checksum field blanked. */
export const packChecksum = (pack: Pack) =>
  createHash('sha256')
    .update(JSON.stringify({ ...pack, checksum: '' }))
    .digest('hex');
