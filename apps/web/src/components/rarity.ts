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
 * The eight finishes (spec, "Raridade e álbum"). `className` sets custom properties read by the
 * reveal: --rc label colour, --face card ground, --ink card text, --edge frame, --holo sheen
 * (`sheen` animates it, `holo-follow` lets it track the pointer).
 */
export const RARITY_STYLE: Record<StickerRarity, { label: string; className: string }> = {
  bronze: {
    label: 'Bronze',
    className:
      '[--rc:#d79a63] [--face:linear-gradient(150deg,#b87444,#8f5329)] [--ink:#2b1608] [--edge:#e8d6c4] [--holo:linear-gradient(transparent,transparent)]',
  },
  prata: {
    label: 'Prata',
    className:
      '[--rc:#d5dce6] [--face:linear-gradient(150deg,#eef2f7,#aeb8c6_55%,#8e9aab)] [--ink:#1d2631] [--edge:#f4f6f9] [--holo:linear-gradient(115deg,transparent_30%,rgb(255_255_255/0.5)_48%,transparent_66%)] holo-follow',
  },
  ouro: {
    label: 'Ouro',
    className:
      '[--rc:#f5c400] [--face:linear-gradient(150deg,#ffe46b,#f2c200_45%,#d99e00)] [--ink:#1a2b1f] [--edge:#fffdf4] [--holo:linear-gradient(transparent,transparent)]',
  },
  ouro_brilhante: {
    label: 'Ouro brilhante',
    className:
      '[--rc:#ffd84a] [--face:linear-gradient(150deg,#fff08a,#f7c800_45%,#dca000)] [--ink:#1a2b1f] [--edge:#fffdf4] [--holo:linear-gradient(115deg,transparent_30%,rgb(255_255_255/0.8)_48%,transparent_62%)] sheen holo-follow',
  },
  destaque_rodada: {
    label: 'Destaque da Rodada',
    className:
      '[--rc:#f5c400] [--face:linear-gradient(150deg,#1a1a1a,#050505)] [--ink:#f2c200] [--edge:#c99a00] [--holo:linear-gradient(115deg,transparent_30%,rgb(245_196_0/0.35)_48%,transparent_62%)] holo-follow',
  },
  selecao_temporada: {
    label: 'Seleção da Temporada',
    className:
      '[--rc:#8fb4ff] [--face:linear-gradient(150deg,#1f4fb0,#0b2160_60%,#07153f)] [--ink:#e8eefc] [--edge:#c9d1dc] [--holo:linear-gradient(115deg,transparent_30%,rgb(190_210_255/0.45)_48%,transparent_62%)] holo-follow',
  },
  idolo: {
    label: 'Ídolo',
    className:
      '[--rc:#e2c37a] [--face:linear-gradient(150deg,#fbf1d6,#ecd9a4_55%,#cdb06a)] [--ink:#4a3410] [--edge:#b8964a] [--holo:linear-gradient(115deg,transparent_30%,rgb(255_250_230/0.6)_48%,transparent_62%)] holo-follow',
  },
  lenda: {
    label: 'Lenda',
    className:
      '[--rc:#ffffff] [--face:linear-gradient(150deg,#e9f2ff,#d6c8ff_50%,#c8f4e8)] [--ink:#1b1f33] [--edge:#ffffff] [--holo:linear-gradient(115deg,#ff6b6b,#ffd36b,#8bff9c,#6bd6ff,#b06bff,#ff6b6b)] holo-rainbow holo-follow',
  },
};
