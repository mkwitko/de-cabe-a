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
 * (`.rar-*`: the custom properties read by the card, the reveal and the result thumbnail), the
 * label colour `--rc` inline (the reveal's pack reads it from here), plus
 * the light behaviour: `sheen` animates the light strip, `holo-follow` lets the reveal move it,
 * `holo-rainbow` tracks the pointer on the card.
 */
export const RARITY_STYLE: Record<StickerRarity, { label: string; className: string }> = {
  bronze: { label: 'Bronze', className: '[--rc:#d79a63] rar-bronze' },
  prata: { label: 'Prata', className: '[--rc:#d5dce6] rar-prata holo-follow' },
  ouro: { label: 'Ouro', className: '[--rc:#f5c400] rar-ouro' },
  ouro_brilhante: {
    label: 'Ouro brilhante',
    className: '[--rc:#ffd84a] rar-ouro-brilhante sheen holo-follow',
  },
  destaque_rodada: {
    label: 'Destaque da Rodada',
    className: '[--rc:#f5c400] rar-destaque holo-follow',
  },
  selecao_temporada: {
    label: 'Seleção da Temporada',
    className: '[--rc:#8fb4ff] rar-selecao holo-follow',
  },
  idolo: { label: 'Ídolo', className: '[--rc:#e2c37a] rar-idolo holo-follow' },
  lenda: { label: 'Lenda', className: '[--rc:#e3c8ff] rar-lenda holo-rainbow holo-follow' },
};
