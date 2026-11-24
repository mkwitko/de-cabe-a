/**
 * The squads of the CONMEBOL cups' foreign clubs, for the person's watched match against one
 * (career/foreign.ts holds their strength).
 *
 * A club whose real squad the pack carries (`pack.foreign`) plays with it. Any other borrows the
 * football of the Brazilian club at its rank in the career's opening pack: the same attributes,
 * positions and ages, under names of its country and the club's nationality. Its strength and eleven therefore equal the
 * ones its quick results use. A borrowed squad lives outside `pack.players`, so no other system
 * ever sees it; only the watched match borrows it. A real squad's players also sit abroad in the
 * pack, on the person's market (development.ts `foreignSquads`): one signed leaves the squad.
 */
import { FOREIGN_CLUBS, type Country } from '../competition/conmebol-data';
import { isForeignClub } from '../competition/groups';
import { cached } from '../lib/pack-cache';
import type { Pack, PackPlayer } from '../pack/schema';
import { REAL_SQUAD } from './development';
import { foreignRank } from './foreign';
import type { Moves } from './market';
import { clubLevels } from './training';

const NATION: Record<Country, string> = {
  ARG: 'AR',
  BOL: 'BO',
  CHI: 'CL',
  COL: 'CO',
  ECU: 'EC',
  PAR: 'PY',
  PER: 'PE',
  URU: 'UY',
  VEN: 'VE',
  MEX: 'MX',
  RSA: 'ZA',
  FRA: 'FR',
};

/** Common given names and surnames of Spanish-speaking South America. */
const FIRST = [
  'Agustín',
  'Alejandro',
  'Andrés',
  'Ángel',
  'Brian',
  'Carlos',
  'Cristian',
  'Daniel',
  'Diego',
  'Emiliano',
  'Facundo',
  'Federico',
  'Felipe',
  'Franco',
  'Gonzalo',
  'Ignacio',
  'Javier',
  'Joaquín',
  'Jorge',
  'José',
  'Juan',
  'Julián',
  'Kevin',
  'Leandro',
  'Lucas',
  'Luis',
  'Marcelo',
  'Martín',
  'Matías',
  'Mauricio',
  'Maximiliano',
  'Miguel',
  'Nahuel',
  'Nicolás',
  'Pablo',
  'Rodrigo',
  'Santiago',
  'Sebastián',
  'Tomás',
  'Valentín',
];
const LAST = [
  'Acosta',
  'Aguirre',
  'Álvarez',
  'Benítez',
  'Cabrera',
  'Castillo',
  'Castro',
  'Díaz',
  'Domínguez',
  'Espinoza',
  'Fernández',
  'Flores',
  'García',
  'Giménez',
  'Gómez',
  'González',
  'Gutiérrez',
  'Herrera',
  'Jiménez',
  'López',
  'Martínez',
  'Medina',
  'Méndez',
  'Molina',
  'Morales',
  'Muñoz',
  'Núñez',
  'Ortiz',
  'Pereira',
  'Pérez',
  'Ramírez',
  'Ramos',
  'Ríos',
  'Rodríguez',
  'Rojas',
  'Romero',
  'Ruiz',
  'Sánchez',
  'Silva',
  'Sosa',
  'Suárez',
  'Torres',
  'Vargas',
  'Vázquez',
  'Vera',
  'Villalba',
];

/** Common given names and surnames in South Africa (Sundowns' borrowed squad). */
const ZA_FIRST = [
  'Andile',
  'Bongani',
  'Lebohang',
  'Lucky',
  'Mandla',
  'Mothobi',
  'Neo',
  'Ronwen',
  'Sipho',
  'Teboho',
  'Thabo',
  'Themba',
  'Thapelo',
  'Tshepo',
  'Sibusiso',
  'Siyabonga',
  'Kagiso',
  'Katlego',
  'Lehlohonolo',
  'Mpho',
];
const ZA_LAST = [
  'Dlamini',
  'Khumalo',
  'Mkhize',
  'Mokoena',
  'Mthembu',
  'Ndlovu',
  'Nkosi',
  'Ngcobo',
  'Mahlangu',
  'Mabaso',
  'Zungu',
  'Shabalala',
  'Maseko',
  'Mofokeng',
  'Molefe',
  'Sithole',
  'Zulu',
  'Radebe',
  'Modise',
  'Williams',
];
/** Common given names and surnames in France (PSG, when the pack has no real squad). */
const FR_FIRST = [
  'Antoine',
  'Hugo',
  'Lucas',
  'Théo',
  'Mathis',
  'Nathan',
  'Enzo',
  'Louis',
  'Kylian',
  'Ousmane',
  'Moussa',
  'Bradley',
  'Warren',
  'Désiré',
  'Jules',
  'Maxime',
  'Yanis',
  'Adrien',
  'Rayan',
  'Bastien',
];
const FR_LAST = [
  'Martin',
  'Bernard',
  'Dubois',
  'Thomas',
  'Robert',
  'Richard',
  'Petit',
  'Durand',
  'Leroy',
  'Moreau',
  'Simon',
  'Laurent',
  'Lefebvre',
  'Michel',
  'Garcia',
  'Fofana',
  'Diallo',
  'Traoré',
  'Camara',
  'Mendy',
];
/** The name pools of each country: Spanish-speaking South America unless listed. */
const NAMES: Partial<Record<Country, { first: string[]; last: string[] }>> = {
  RSA: { first: ZA_FIRST, last: ZA_LAST },
  FRA: { first: FR_FIRST, last: FR_LAST },
};

/** FNV-1a: names drawn from the club and the shirt number, the same on every device. */
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/**
 * A foreign club's squad in `season`; empty for an id that is not one. A real squad's players
 * the person signed (any move in `moves`) have left it, and its strength with them (training.ts
 * `clubLevels`).
 */
export function foreignSquad(
  origin: Pack,
  season: number,
  id: string,
  moves?: Moves,
): PackPlayer[] {
  const squad = everyone(origin, season, id);
  return moves ? squad.filter((p) => !moves[p.id]) : squad;
}

function everyone(origin: Pack, season: number, id: string): PackPlayer[] {
  return cached(origin, 'foreignSquad', `${id}@${season}`, () => {
    const club = FOREIGN_CLUBS.find((c) => c.id === id);
    if (!club) return [];
    const years = season - origin.season;
    const aged = (p: PackPlayer): PackPlayer => ({
      ...p,
      birthDate: `${Number(p.birthDate.slice(0, 4)) + years}${p.birthDate.slice(4)}`,
    });
    // The real squad, where the pack has one (Boca, River from the FM export).
    const real = origin.foreign?.find((f) => f.id === id)?.players ?? [];
    if (real.length >= REAL_SQUAD) return real.map(aged);
    const order = [...clubLevels(origin, origin.season).strength]
      .filter(([k]) => !isForeignClub(k))
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .map(([k]) => k);
    const twin = order[Math.min(order.length, foreignRank(id, origin)) - 1];
    const gen = { origin: 'generated' as const, confidence: 'high' as const };
    return origin.players
      .filter((p) => p.clubId === twin)
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((p, i): PackPlayer => {
        const h = hash(`${id}:${i}`);
        const { first, last } = NAMES[club.country] ?? { first: FIRST, last: LAST };
        // The same age as the borrowed player at the opening, whatever the season.
        return aged({
          id: `${id}-p${String(i + 1).padStart(2, '0')}`,
          name: `${first[h % first.length]} ${last[(h >>> 8) % last.length]}`,
          birthDate: p.birthDate,
          nationality: NATION[club.country],
          ...(p.heightCm !== undefined && { heightCm: p.heightCm }),
          foot: p.foot,
          positions: p.positions,
          attributes: p.attributes,
          potential: p.potential,
          personality: p.personality,
          hidden: p.hidden,
          traits: p.traits,
          clubId: id,
          field: { ...p.field, identity: gen },
        });
      });
  });
}

/**
 * The pack a match between `home` and `away` is played from: the career's own, with the foreign
 * side's squad added when one of them is a foreign club.
 */
export function matchPack(
  w: { pack: Pack; origin: Pack; season: { season: number }; moves?: Moves },
  home: string,
  away: string,
): Pack {
  const extra = [home, away]
    .filter(isForeignClub)
    .flatMap((id) => foreignSquad(w.origin, w.season.season, id, w.moves));
  if (!extra.length) return w.pack;
  // A real squad's players also sit abroad in the pack, on the person's market: here, at their club.
  const theirs = new Set(extra.map((p) => p.id));
  return { ...w.pack, players: [...w.pack.players.filter((p) => !theirs.has(p.id)), ...extra] };
}
