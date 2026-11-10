export type Rarity =
  | 'bronze'
  | 'prata'
  | 'ouro'
  | 'ouro_brilhante'
  | 'destaque_rodada'
  | 'selecao_temporada'
  | 'idolo'
  | 'lenda';

export const RARITY_ORDER: readonly Rarity[] = [
  'bronze',
  'prata',
  'ouro',
  'ouro_brilhante',
  'destaque_rodada',
  'selecao_temporada',
  'idolo',
  'lenda',
];

export const rank = (r: Rarity): number => RARITY_ORDER.indexOf(r);

const FAME_BONUS = { T1: 3, T2: 2, T3: 1, T4: 0 } as const;

export interface LevelRarityInput {
  stars: 0 | 1 | 2 | 3;
  fame: 'T1' | 'T2' | 'T3' | 'T4';
  difficulty: 1 | 2 | 3;
  retired: boolean;
  streakDays: number;
  flawless: boolean;
}

/** Rarity of the sticker a won level earns. Never returns destaque_rodada/selecao_temporada (awarded lazily). */
export function levelRarity(i: LevelRarityInput): Rarity {
  const top = i.stars === 3 && i.difficulty === 3;
  if (top && i.fame === 'T1' && i.retired) {
    return i.flawless && i.streakDays >= 7 ? 'lenda' : 'idolo';
  }
  if (top && (i.fame === 'T1' || i.fame === 'T2')) return 'ouro_brilhante';
  const points = i.stars + FAME_BONUS[i.fame] + (i.difficulty - 1);
  return points >= 6 ? 'ouro' : points >= 4 ? 'prata' : 'bronze';
}
