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
 * label colour `--rc` inline, plus the light behaviour: `holo-rainbow` (Lenda) lays the foil
 * strip in colour. The light is static (no sheen, no pointer tracking).
 */
export const RARITY_STYLE: Record<StickerRarity, { label: string; className: string }> = {
  bronze: { label: 'Bronze', className: '[--rc:#d79a63] rar-bronze' },
  prata: { label: 'Prata', className: '[--rc:#d5dce6] rar-prata' },
  ouro: { label: 'Ouro', className: '[--rc:#f5c400] rar-ouro' },
  ouro_brilhante: {
    label: 'Ouro brilhante',
    className: '[--rc:#ffd84a] rar-ouro-brilhante',
  },
  destaque_rodada: {
    label: 'Destaque da Rodada',
    className: '[--rc:#f5c400] rar-destaque',
  },
  selecao_temporada: {
    label: 'Seleção da Temporada',
    className: '[--rc:#8fb4ff] rar-selecao',
  },
  idolo: { label: 'Ídolo', className: '[--rc:#e2c37a] rar-idolo' },
  lenda: { label: 'Lenda', className: '[--rc:#e3c8ff] rar-lenda holo-rainbow' },
};
