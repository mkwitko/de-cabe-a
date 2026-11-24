/**
 * The squads of the CONMEBOL cups' foreign clubs, for the person's watched match against one
 * (career/foreign.ts holds their strength).
 *
 * A club whose real squad the pack carries (`pack.foreign`) plays with it. Any other borrows the
 * football of the Brazilian club at its rank in the career's opening pack: the same attributes,
 * positions and ages, under new names and the club's nationality. Its strength and eleven therefore equal the
 * ones its quick results use. The squads live outside `pack.players`, so no other system (the
 * market, the boards, the academies) ever sees them; only the watched match borrows them.
 */
import { FOREIGN_CLUBS, type Country } from '../competition/conmebol-data';
import { isForeignClub } from '../competition/groups';
import { cached } from '../lib/pack-cache';
import type { Pack, PackPlayer } from '../pack/schema';
import { foreignRank } from './foreign';
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

/** FNV-1a: names drawn from the club and the shirt number, the same on every device. */
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** A foreign club's squad in `season`; empty for an id that is not one. */
export function foreignSquad(origin: Pack, season: number, id: string): PackPlayer[] {
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
    if (real.length >= 18) return real.map(aged);
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
        // The same age as the borrowed player at the opening, whatever the season.
        return aged({
          id: `${id}-p${String(i + 1).padStart(2, '0')}`,
          name: `${FIRST[h % FIRST.length]} ${LAST[(h >>> 8) % LAST.length]}`,
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
  w: { pack: Pack; origin: Pack; season: { season: number } },
  home: string,
  away: string,
): Pack {
  const extra = [home, away]
    .filter(isForeignClub)
    .flatMap((id) => foreignSquad(w.origin, w.season.season, id));
  return extra.length ? { ...w.pack, players: [...w.pack.players, ...extra] } : w.pack;
}
