/**
 * The foreign clubs of the CONMEBOL cups in the career (competition/conmebol-data.ts): their
 * strength on the Brazilian clubs' scale. They play quick results only for now.
 *
 * Strength, until the pack carries the FM reputation of each foreign club: the Brazilian club
 * of the same rank, the rank read from the club's stage of entry and its association's level.
 * Every rank here is a PARÂMETRO (CONMEBOL ranking 2026: Palmeiras and Flamengo, then River and
 * Boca, Peñarol 5th, Nacional 8th, Racing 9th; Bolivian, Peruvian and Venezuelan clubs lower).
 */
import {
  FOREIGN_CLUBS,
  LIBERTADORES_FOREIGN,
  SUDAMERICANA_FOREIGN,
  type Country,
} from '../competition/conmebol-data';
import type { Pack } from '../pack/schema';

/** Rank among the Brazilian clubs (1 the strongest) by stage of entry. */
const STAGE_RANK = {
  libertadoresGroups: 14,
  libertadoresSecond: 20,
  libertadoresFirst: 28,
  sudamericanaGroups: 18,
  sudamericanaFirst: 32,
} as const;
/** Ranks gained (negative) or lost by association. */
const COUNTRY_RANK: Record<Country, number> = {
  ARG: -6,
  URU: -2,
  COL: 0,
  ECU: 0,
  PAR: 0,
  CHI: 2,
  PER: 4,
  BOL: 4,
  VEN: 6,
};
/** River and Boca rank with the best Brazilian clubs (CONMEBOL ranking 2026: 3rd and 4th). */
const OWN_RANK: Record<string, number> = { 'foreign-arg-river': 4, 'foreign-arg-boca': 5 };

const stageOf = new Map<string, keyof typeof STAGE_RANK>([
  ...LIBERTADORES_FOREIGN.groups.map((id) => [id, 'libertadoresGroups'] as const),
  ...LIBERTADORES_FOREIGN.second.map((id) => [id, 'libertadoresSecond'] as const),
  ...LIBERTADORES_FOREIGN.first.map((id) => [id, 'libertadoresFirst'] as const),
  ...SUDAMERICANA_FOREIGN.groups.map((id) => [id, 'sudamericanaGroups'] as const),
  ...SUDAMERICANA_FOREIGN.first.map((id) => [id, 'sudamericanaFirst'] as const),
]);

/**
 * Each foreign club's rank among the Brazilian clubs, 1 the strongest. With the pack's FM
 * reputation (`pack.foreign`), the rank is the clubs' own reputation order; without, the
 * PARÂMETRO ranks above.
 */
export function foreignRank(id: string, pack?: Pack): number {
  const rep = pack?.foreign?.find((f) => f.id === id)?.reputation;
  if (rep !== undefined) return 1 + pack!.clubs.filter((c) => c.reputation > rep).length;
  const own = OWN_RANK[id];
  if (own !== undefined) return own;
  const c = FOREIGN_CLUBS.find((x) => x.id === id);
  const stage = stageOf.get(id);
  if (!c || !stage) return 40;
  return Math.max(1, STAGE_RANK[stage] + COUNTRY_RANK[c.country]);
}

/**
 * The foreign clubs' strength and eleven, given the Brazilian clubs' (`strength`, `eleven`):
 * each takes the values of the Brazilian club at its rank.
 */
export function foreignLevels(
  strength: ReadonlyMap<string, number>,
  eleven: ReadonlyMap<string, number>,
  pack?: Pack,
  /** A real squad's own measure (training.ts `clubLevel`), when the pack has one. */
  real?: (id: string) => { strength: number; eleven: number } | undefined,
): { id: string; strength: number; eleven: number }[] {
  const order = [...strength.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  if (order.length === 0) return [];
  return FOREIGN_CLUBS.map((c) => {
    const own = real?.(c.id);
    if (own) return { id: c.id, ...own };
    const at = order[Math.min(order.length, foreignRank(c.id, pack)) - 1]!;
    return { id: c.id, strength: strength.get(at)!, eleven: eleven.get(at) ?? 0 };
  });
}
