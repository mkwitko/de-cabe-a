/**
 * A year passes for every player (03 §3): the young grow toward what they can become, the old
 * lose their legs and then leave the game, and each club's academy brings in a new crop. Run
 * once at each season's turn.
 *
 * How much a young player grows is not his alone: the club's training ground, the minutes he
 * played and the week the person trained him all move it (`growthOf`). No attribute is stored
 * in the snapshot: the career keeps, for each finished season, one character per player with
 * how much he grew that year (`SeasonLog`), and a loaded career runs the years again from the
 * pack it opened with. Everything else a year does (age, the year he had, retirement, the
 * academies' crop) comes from the seed. Integer arithmetic and the seeded generator
 * only (ADR-020); every number is a PARÂMETRO, not calibrated.
 */
import { ABROAD } from '../market/abroad';
import {
  GOALKEEPING,
  MENTAL,
  PHYSICAL,
  TACTICAL,
  TECHNICAL,
  fork,
  pick,
  rngFrom,
  type AttributeId,
  type Rng,
} from '@decabeca/match-engine';
import { generateAttributes, generatePlayer, SQUAD } from '../generate/player';
import { WHOLE, cached } from '../lib/pack-cache';
import type { Pack, PackPlayer } from '../pack/schema';
import { goingWage } from '../market/value';
import { PRICE_BASE, priced } from './prices';
import { bestRoles } from '../player/ratings';
import type { Intensity } from './training';

type Group = 'technical' | 'mental' | 'physical';
const GROUP = new Map<AttributeId, Group>([
  ...TECHNICAL.map((a) => [a, 'technical'] as const),
  ...GOALKEEPING.map((a) => [a, 'technical'] as const),
  ...MENTAL.map((a) => [a, 'mental'] as const),
  ...TACTICAL.map((a) => [a, 'mental'] as const),
  ...PHYSICAL.map((a) => [a, 'physical'] as const),
]);

/** A fixed number 0..99 for a player, a season and a purpose. */
function draw(seed: number, playerId: string, season: number, salt: number): number {
  let h = Math.imul(2166136261 ^ salt, 16777619) ^ seed ^ Math.imul(season, 40503);
  for (let i = 0; i < playerId.length; i++) h = Math.imul(h ^ playerId.charCodeAt(i), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) % 100;
}

const clamp = (x: number) => Math.max(1, Math.min(99, x));
const ageIn = (p: PackPlayer, season: number) => season - Number(p.birthDate.slice(0, 4));

/** The legs peak before the rest: two years early, one on a late curve, three on an early one. */
const legsPeak = (p: PackPlayer) =>
  p.potential.peakAge -
  (p.potential.physicalCurve === 'early' ? 3 : p.potential.physicalCurve === 'late' ? 1 : 2);

/**
 * How hard he works at getting better, in percent, from who he is: professionalism most,
 * then ambition and resilience (each 1..20). About 60% for the idle to 125% for the driven.
 */
export const drive = (p: PackPlayer) =>
  55 +
  2 * p.personality.professionalism +
  p.personality.ambition +
  Math.round(p.personality.resilience / 2);

/**
 * The year he had, in percent: most are ordinary, one in six goes nowhere (a slump, a niggle,
 * a bad dressing room) and one in six is the year it all clicks.
 */
function year(seed: number, p: PackPlayer, season: number): number {
  const roll = draw(seed, p.id, season, 0);
  return roll < 16 ? 25 : roll >= 84 ? 170 : 80 + (roll % 5) * 10;
}

/**
 * One player a year older, at the start of `season`.
 *
 * His ceiling is what he may become, not what he will: each year he closes a share of the gap
 * to it, and that share is his talent for learning, times how hard he works (`drive`), times
 * the year he had, times `growth` (where he trained, how much he played, the week his coach
 * set: `growthOf`). The window shuts at his peak age. Measured on a crop followed to its peak:
 * an ordinary player in an ordinary club ends about two thirds of the way and one in fifty
 * gets within a tenth of his ceiling; well looked after, four fifths and nearly one in five;
 * neglected, under half and none. What age takes away none of this
 * changes.
 */
export function develop(p: PackPlayer, seed: number, season: number, growth = 100): PackPlayer {
  const age = ageIn(p, season);
  const peak = p.potential.peakAge;
  const legs = legsPeak(p);
  const out = { ...p.attributes };
  // All three factors in one percentage, so a point of rate stays a point.
  const effort = Math.round((drive(p) * year(seed, p, season) * growth) / 10_000);
  /** A share of what is left to the ceiling; a single point only now and then. */
  const gain = (gap: number, rate: number, roll: number, often: number) =>
    Math.max(roll < (often * effort) / 100 ? 1 : 0, Math.round((gap * rate * effort) / 10_000));
  let k = 0;
  for (const a of Object.keys(out) as AttributeId[]) {
    const group = GROUP.get(a) ?? 'technical';
    const roll = draw(seed, p.id, season, ++k);
    const v = out[a];
    if (group === 'physical') {
      if (age <= legs) {
        const gap = p.potential.ceiling.physical - v;
        if (gap > 0)
          out[a] = clamp(v + gain(gap, 9 + Math.round(p.potential.learning / 2), roll, 30));
      } else {
        // Past the peak the legs go: a point a year at first, two, then three.
        const past = age - legs;
        const loss =
          past <= 2 ? (roll < 50 ? 1 : 0) : past <= 5 ? (roll < 70 ? 2 : 1) : roll < 60 ? 3 : 2;
        out[a] = clamp(v - loss);
      }
      continue;
    }
    const ceiling = p.potential.ceiling[group];
    if (age <= peak) {
      const gap = ceiling - v;
      // 11% to 18% of the gap a year up to 21, 6% to 11% after: the early years are the ones.
      const rate =
        age <= 21
          ? 9 + Math.round(p.potential.learning / 2)
          : 5 + Math.round(p.potential.learning / 3);
      if (gap > 0) out[a] = clamp(v + gain(gap, rate, roll, 25));
    } else if (group === 'mental') {
      // Experience still adds a little for some years, then holds.
      if (age <= peak + 4 && v < ceiling && roll < 35) out[a] = clamp(v + 1);
    } else if (age > peak + 3) {
      // Technique fades late and slowly.
      if (roll < (age > peak + 6 ? 70 : 40)) out[a] = clamp(v - 1);
    }
  }
  return { ...p, attributes: out };
}

/**
 * True when he hangs up his boots before `season`: from 36 on, surer each year. Keepers go two
 * years later; players of the lowest levels, who never lived well off the game, up to three
 * years sooner.
 */
export function retires(p: PackPlayer, seed: number, season: number): boolean {
  const keeper = p.positions.some((x) => x.position === 'GK');
  const level = bestRoles(p.attributes, 1)[0]!.rating;
  const from = 36 + (keeper ? 2 : 0) - (level < 32 ? 3 : level < 42 ? 1 : 0);
  const over = ageIn(p, season) - from;
  return over >= 0 && draw(seed, p.id, season, 99) < (over + 1) * 25;
}

/** Each club's standing in the pack the career opened with: the median level of its squad. */
const baseLevels = (origin: Pack) =>
  cached(origin, 'baseLevels', WHOLE, () => {
    const by = new Map<string, number[]>();
    for (const p of origin.players)
      if (p.clubId)
        (by.get(p.clubId) ?? by.set(p.clubId, []).get(p.clubId)!).push(
          bestRoles(p.attributes, 1)[0]!.rating,
        );
    return new Map(
      [...by].map(([id, rs]) => [id, rs.sort((a, b) => a - b)[rs.length >> 1] ?? 40] as const),
    );
  });

/**
 * The talent map (mapa de conhecimento §2.9): how many players of the pack a club formed
 * (`origin.clubId`) who play at a professional level today. A club with a record of forming
 * players brings better boys and more gems. PARÂMETROS.
 */
const FORMED_LEVEL = 58;
const FORMER_TIERS: readonly { formed: number; quality: number; gem: number }[] = [
  { formed: 20, quality: 2, gem: 4 },
  { formed: 8, quality: 1, gem: 5 },
  { formed: 0, quality: 0, gem: 6 },
];
export const formedBy = (pack: Pack): Map<string, number> =>
  cached(pack, 'formedBy', WHOLE, () => {
    const by = new Map<string, number>();
    for (const p of pack.players) {
      const club = p.origin?.clubId;
      if (club && bestRoles(p.attributes, 1)[0]!.rating >= FORMED_LEVEL)
        by.set(club, (by.get(club) ?? 0) + 1);
    }
    return by;
  });
const formerOf = (pack: Pack, clubId: string) =>
  FORMER_TIERS.find((t) => (formedBy(pack).get(clubId) ?? 0) >= t.formed)!;

/** Boys a club's academy brings up in a year, by its youth level 1..5. */
const CROP = [3, 3, 4, 5, 6] as const;

/**
 * A club's crop for `season`: fifteen to seventeen years old, well under the first team today,
 * a few of them with a ceiling far above it. Better academies bring more and better.
 */
export function crop(
  origin: Pack,
  clubId: string,
  seed: number,
  season: number,
  wages = PRICE_BASE,
  youthLevel?: number,
): PackPlayer[] {
  const club = origin.clubs.find((c) => c.id === clubId)!;
  const level = baseLevels(origin).get(clubId) ?? 40;
  const youth = youthLevel ?? club.facilities.youth;
  const root = fork(rngFrom(seed), `crop:${season}:${clubId}`);
  const former = formerOf(origin, clubId);
  const out: PackPlayer[] = [];
  for (let k = 0; k < CROP[youth - 1]!; k++) {
    const r = fork(root, `boy:${k}`);
    const position = SQUAD[pick(r, SQUAD.length)]!;
    const age = 15 + pick(r, 3);
    // An academy of a club that bets on boys (youthPolicy) brings in a little better: -2..+2.
    const lean = Math.round((club.profile.youthPolicy - 50) / 25);
    const quality = Math.max(20, level - 13 + youth + former.quality + lean + pick(r, 7));
    const made = generatePlayer(r, {
      id: `y${season}-${clubId}-${k}`,
      position,
      quality,
      clubId,
      season,
    });
    // One in six is the kind that outgrows the club (one in four at a great former); the rest
    // reach about its level.
    const gem = pick(r, former.gem) === 0 ? 10 + pick(r, 12) : 0;
    const reach = (base: number) => clamp(level + base + gem + pick(r, 8));
    const attributes = generateAttributes(fork(r, 'attributes'), position, quality, age);
    // A first contract: two fifths of what the market pays a man of his level today.
    const wage = Math.round(
      (priced(goingWage(origin, bestRoles(attributes, 1)[0]!.rating), wages) * 40) / 100,
    );
    out.push({
      ...made,
      birthDate: `${season - age}${made.birthDate.slice(4)}`,
      attributes,
      potential: {
        ...made.potential,
        ceiling: { technical: reach(-2), mental: reach(0), physical: reach(-4) },
      },
      contract: { wage, until: `${season + 2}-12-31`, releaseFee: null },
      // Formed here: the club's solidarity share when he is sold on.
      origin: { ...made.origin, clubId },
    });
  }
  return out;
}

/**
 * Players the foreign market offers each season, and their levels and ages. PARÂMETRO, set so the
 * league pays abroad about what the Banco Central counts (US$ 180-235 mi in 2024-2025, reality
 * bench). 320 -> 330 with the state championships: their extra matches tire and hurt squads,
 * which moved the foreign signings under the bench's floor.
 */
const IMPORTS = 330;
/**
 * Quality from 52 to 82, one draw: most who come are the middle of the South American market,
 * cheap next to a Brazilian of the same level, a few are stars back from Europe.
 */
const IMPORT_QUALITY: [number, number] = [52, 82];
/**
 * Where they come from, per hundred: the foreigners of the Série A 2025 by nationality
 * (Tribuna do Planalto: 47 Argentines, 27 Uruguayans, 19 Colombians, 8 Ecuadorians, 7
 * Portuguese; Itatiaia: 7 Paraguayans, 7 Chileans, 2 Venezuelans, 2 Bolivians).
 */
const IMPORT_NATIONS: readonly [string, number][] = [
  ['AR', 36],
  ['UY', 20],
  ['CO', 15],
  ['EC', 6],
  ['PY', 6],
  ['CL', 5],
  ['PT', 5],
  ['VE', 2],
  ['PE', 2],
  ['BO', 2],
  ['ES', 1],
];
/** Names for those who come from the Spanish-speaking market; the Portuguese keep Brazil's. */
const HISPANIC_FIRST = (
  'Agustín Alan Alejandro Andrés Bruno Camilo Cristian Diego Emiliano Enzo Esteban Facundo ' +
  'Federico Franco Gastón Gonzalo Ignacio Joaquín Jorge Juan Julián Leandro Lucas Lucio Manuel ' +
  'Marcos Martín Matías Maximiliano Nahuel Nicolás Pablo Rodrigo Santiago Sebastián Tomás Valentín'
).split(' ');
const HISPANIC_LAST = (
  'Acosta Aguirre Álvarez Benítez Cabrera Castro Cáceres Díaz Domínguez Fernández Flores ' +
  'Giménez Gómez González Gutiérrez Herrera Ibáñez López Medina Méndez Molina Morales Muñoz ' +
  'Núñez Ortiz Pereyra Ramírez Ríos Rodríguez Romero Rojas Sánchez Sosa Suárez Torres Vargas ' +
  'Vázquez Villalba Zapata'
).split(' ');

/** A foreign market player's nation and name, drawn apart from the rest of him. */
function foreignerOf(
  r: Rng,
  made: PackPlayer,
): Pick<PackPlayer, 'nationality' | 'name' | 'knownAs'> {
  const f = fork(r, 'nation');
  let roll = pick(f, 100);
  let nation = IMPORT_NATIONS[0]![0];
  for (const [n, share] of IMPORT_NATIONS) {
    nation = n;
    if (roll < share) break;
    roll -= share;
  }
  if (nation === 'PT') return { nationality: nation, name: made.name, knownAs: made.knownAs };
  const first = HISPANIC_FIRST[pick(f, HISPANIC_FIRST.length)]!;
  const last = HISPANIC_LAST[pick(f, HISPANIC_LAST.length)]!;
  // Known by the surname, the way the press calls them here.
  return { nationality: nation, name: `${first} ${last}`, knownAs: last };
}
const IMPORT_AGES: [number, number] = [22, 32];

/** True for a player of the foreign market who has not signed for a club of the league. */
export const isImport = (id: string) => /^f\d+-/.test(id);

/**
 * The foreign market of `season` (04 §4.7): players from abroad, mostly South Americans, a
 * Brazilian club can bring in. They sit abroad, on the wage the market pays their level, and
 * leave the game at the season's end if nobody here signed them.
 */
export function imports(
  origin: Pack,
  seed: number,
  season: number,
  wages = PRICE_BASE,
): PackPlayer[] {
  const root = fork(rngFrom(seed), `imports:${season}`);
  const out: PackPlayer[] = [];
  for (let k = 0; k < IMPORTS; k++) {
    const r = fork(root, `player:${k}`);
    const position = SQUAD[pick(r, SQUAD.length)]!;
    const age = IMPORT_AGES[0] + pick(r, IMPORT_AGES[1] - IMPORT_AGES[0] + 1);
    const span = IMPORT_QUALITY[1] - IMPORT_QUALITY[0] + 1;
    const quality = IMPORT_QUALITY[0] + pick(r, span);
    const made = generatePlayer(r, {
      id: `f${season}-${k}`,
      position,
      quality,
      clubId: ABROAD,
      season,
    });
    const attributes = generateAttributes(fork(r, 'attributes'), position, quality, age);
    const wage = priced(goingWage(origin, bestRoles(attributes, 1)[0]!.rating), wages);
    out.push({
      ...made,
      ...foreignerOf(r, made),
      birthDate: `${season - age}${made.birthDate.slice(4)}`,
      attributes,
      contract: { wage, until: `${season + 2}-12-31`, releaseFee: null },
    });
  }
  return out;
}

/** The pack with the foreign market of the season it opens in, as a career starts it. */
export const withImports = (pack: Pack, seed: number, season: number): Pack => ({
  ...pack,
  players: [...pack.players, ...imports(pack, seed, season)],
});

/**
 * What a season leaves behind: for each player of the pack as it stood at the season's end, in
 * the pack's order, one character with his growth for the year that follows (`codeOf`).
 */
export interface SeasonLog {
  season: number;
  growth: string;
  /** The next season's price rate and indices (prices.ts); absent in logs written before. */
  rate?: number;
  prices?: number;
  wages?: number;
  /** Each club's academy level for the crop, one digit a club in the opening pack's order. */
  youth?: string;
}

/** The academies' levels as `SeasonLog.youth` keeps them. */
export const youthOf = (origin: Pack, pack: Pack): string => {
  const now = new Map(pack.clubs.map((c) => [c.id, c.facilities.youth]));
  return origin.clubs.map((c) => now.get(c.id) ?? c.facilities.youth).join('');
};

/** What the person did in the season that the growth of their players reads. */
export interface Mine {
  clubId: string;
  intensity: Intensity;
  /** How much each player started: 0 left out, 1 a squad player, 2 a starter. */
  played: Record<string, number>;
}

/** A player who leaves the game at the turn (a whole season without a club). */
const GONE = '!';
/** Growth is kept in steps of two points from 40%: one printable character a player. */
const FLOOR = 40;
const STEP = 2;
const BASE_CODE = 48;
const codeFor = (growth: number) =>
  String.fromCharCode(BASE_CODE + Math.max(0, Math.min(70, Math.round((growth - FLOOR) / STEP))));
/** The growth a character stands for; null for a player who leaves the game. */
const growthAt = (code: string, i: number): number | null =>
  code[i] === GONE || code[i] === undefined
    ? null
    : FLOOR + STEP * (code.charCodeAt(i) - BASE_CODE);

/** Percent of growth by the club's training ground, level 1..5. */
const BY_GROUND = [-10, -5, 0, 8, 15] as const;
/** By minutes: left out, a squad player, a starter. */
const BY_MINUTES = [-30, 0, 25] as const;
/** By the week the person trained. */
const BY_WEEK: Record<Intensity, number> = { light: -5, normal: 0, hard: 8 };

/**
 * How much each player of the pack grows this year, in percent, from where he spent the season:
 * his club's training ground, the minutes he had (the eleven best of a squad start, the next
 * seven are squad players; in the person's club, who they really started), and the person's
 * training week. A player without a club trains alone: the least.
 */
export function growthOf(pack: Pack, mine: Mine): Map<string, number> {
  const grounds = new Map(pack.clubs.map((c) => [c.id, BY_GROUND[c.facilities.training - 1]!]));
  const squads = new Map<string, { id: string; level: number }[]>();
  for (const p of pack.players)
    if (p.clubId)
      (squads.get(p.clubId) ?? squads.set(p.clubId, []).get(p.clubId)!).push({
        id: p.id,
        level: bestRoles(p.attributes, 1)[0]!.rating,
      });
  const out = new Map<string, number>();
  for (const [clubId, squad] of squads) {
    if (clubId === ABROAD) {
      // Abroad: a good training ground and a squad player's minutes, whoever he is.
      for (const p of squad) out.set(p.id, 100 + BY_GROUND[3]! + BY_MINUTES[1]);
      continue;
    }
    squad.sort((a, b) => b.level - a.level || (a.id < b.id ? -1 : 1));
    const own = clubId === mine.clubId;
    for (const [rank, p] of squad.entries()) {
      const minutes = own ? (mine.played[p.id] ?? 0) : rank < 11 ? 2 : rank < 18 ? 1 : 0;
      out.set(
        p.id,
        100 + grounds.get(clubId)! + BY_MINUTES[minutes]! + (own ? BY_WEEK[mine.intensity] : 0),
      );
    }
  }
  for (const p of pack.players) if (!p.clubId) out.set(p.id, 100 + BY_GROUND[0] + BY_MINUTES[0]);
  return out;
}

/**
 * The season's line for the log: each player's growth in the pack's order. A player without a
 * club who was not released this season (`released`) has gone a whole year unsigned and leaves.
 */
export function codeOf(pack: Pack, mine: Mine, released: ReadonlySet<string>): string {
  const growth = growthOf(pack, mine);
  let code = '';
  for (const p of pack.players)
    code +=
      (p.clubId === null && !released.has(p.id)) || (p.clubId === ABROAD && isImport(p.id))
        ? GONE
        : codeFor(growth.get(p.id) ?? 100);
  return code;
}

/**
 * The pack a year on, for the season after `log.season`: everyone a year older and changed by
 * it, the retired and those the log marks as gone removed, each club's crop in. `origin` is the
 * pack the career opened with. It reads nothing a transfer changes (no club, no contract), so
 * a loaded career can run it on the opening pack and apply its moves after.
 */
export function evolve(pack: Pack, origin: Pack, seed: number, log: SeasonLog): Pack {
  const season = log.season + 1;
  const players: PackPlayer[] = [];
  for (const [i, p] of pack.players.entries()) {
    const growth = growthAt(log.growth, i);
    if (growth === null || retires(p, seed, season)) continue;
    players.push(develop(p, seed, season, growth));
  }
  origin.clubs.forEach((c, i) => {
    const youth = log.youth ? Number(log.youth[i]) : undefined;
    players.push(...crop(origin, c.id, seed, season, log.wages, youth));
  });
  players.push(...imports(origin, seed, season, log.wages));
  return { ...pack, players };
}
