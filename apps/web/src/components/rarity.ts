import type { StickerRarity } from '@decabeca/contracts';

/** Lowest to highest. Higher levels get a longer reveal. */
export const RARITY_ORDER: StickerRarity[] = [
  'bronze',
  'prata',
  'ouro',
  'ouro_brilhante',
  'destaque_rodada',
  'selecao_temporada',
  'idolo',
  'lenda',
];

/**
 * The eight finishes (spec, "Raridade e álbum"). `className` names the theme in index.css
 * (`.rar-*`: the custom properties read by the card, the reveal and the result thumbnail) plus
 * the light behaviour: `sheen` animates the light strip, `holo-follow` lets the reveal move it,
 * `holo-rainbow` tracks the pointer on the card.
 */
export const RARITY_STYLE: Record<StickerRarity, { label: string; className: string }> = {
  bronze: { label: 'Bronze', className: 'rar-bronze' },
  prata: { label: 'Prata', className: 'rar-prata holo-follow' },
  ouro: { label: 'Ouro', className: 'rar-ouro' },
  ouro_brilhante: { label: 'Ouro brilhante', className: 'rar-ouro-brilhante sheen holo-follow' },
  destaque_rodada: { label: 'Destaque da Rodada', className: 'rar-destaque holo-follow' },
  selecao_temporada: { label: 'Seleção da Temporada', className: 'rar-selecao holo-follow' },
  idolo: { label: 'Ídolo', className: 'rar-idolo holo-follow' },
  lenda: { label: 'Lenda', className: 'rar-lenda holo-rainbow holo-follow' },
};
