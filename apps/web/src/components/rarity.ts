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
 * card and the reveal: --rc label colour, --edge solid frame (small thumbnails), --rim shield rim, --face card ground, --ink card
 * text, --band/--band-ink the name band, --holo the light layer (`sheen` animates it,
 * `holo-follow` lets the reveal move it, `holo-rainbow` tracks the pointer on the card).
 */
export const RARITY_STYLE: Record<StickerRarity, { label: string; className: string }> = {
  bronze: {
    label: 'Bronze',
    className:
      '[--rc:#d79a63] [--edge:#e8d6c4] [--rim:linear-gradient(160deg,#c98a5a,#6e3d1c)] [--face:radial-gradient(120%_80%_at_70%_15%,#c88555,#93552c_55%,#6b3a1a)] [--ink:#24120a] [--band:#3a1e0e] [--band-ink:#f3d9bf] [--holo:linear-gradient(transparent,transparent)]',
  },
  prata: {
    label: 'Prata',
    className:
      '[--rc:#d5dce6] [--edge:#f4f6f9] [--rim:linear-gradient(160deg,#ffffff,#8592a3_50%,#dfe5ec)] [--face:linear-gradient(165deg,#f4f7fa,#c3ccd7_45%,#8996a8)] [--ink:#18212c] [--band:#1f2a37] [--band-ink:#eef2f7] [--holo:linear-gradient(115deg,transparent_35%,rgb(255_255_255/0.55)_48%,transparent_60%)] holo-follow',
  },
  ouro: {
    label: 'Ouro',
    className:
      '[--rc:#f5c400] [--edge:#fffdf4] [--rim:linear-gradient(160deg,#fff3b0,#b98300_55%,#ffe27a)] [--face:radial-gradient(120%_80%_at_70%_15%,#ffe98a,#f0bf10_50%,#c88f00)] [--ink:#2a1d00] [--band:#2a1d00] [--band-ink:#ffe27a] [--holo:linear-gradient(transparent,transparent)]',
  },
  ouro_brilhante: {
    label: 'Ouro brilhante',
    className:
      '[--rc:#ffd84a] [--edge:#fffdf4] [--rim:linear-gradient(160deg,#fffbe0,#d49a00_45%,#fff0a0)] [--face:radial-gradient(120%_80%_at_70%_15%,#fff6b8,#f7c800_45%,#d79a00)] [--ink:#2a1d00] [--band:#2a1d00] [--band-ink:#fff0a0] [--holo:linear-gradient(115deg,transparent_30%,rgb(255_255_255/0.85)_47%,transparent_60%)] sheen holo-follow',
  },
  destaque_rodada: {
    label: 'Destaque da Rodada',
    className:
      '[--rc:#f5c400] [--edge:#c99a00] [--rim:linear-gradient(160deg,#ffe27a,#8a6400_50%,#f2c200)] [--face:radial-gradient(120%_80%_at_70%_10%,#2b2b2b,#0b0b0b_60%,#000)] [--ink:#f2c200] [--band:#f2c200] [--band-ink:#0b0b0b] [--holo:linear-gradient(115deg,transparent_30%,rgb(245_196_0/0.35)_48%,transparent_62%)] holo-follow',
  },
  selecao_temporada: {
    label: 'Seleção da Temporada',
    className:
      '[--rc:#8fb4ff] [--edge:#c9d1dc] [--rim:linear-gradient(160deg,#f2f5fa,#8a96a8_50%,#dfe5ec)] [--face:radial-gradient(120%_80%_at_70%_10%,#2a5fc8,#0e2a78_55%,#06143c)] [--ink:#e8eefc] [--band:#dfe5ec] [--band-ink:#0b1f55] [--holo:linear-gradient(115deg,transparent_30%,rgb(200_220_255/0.45)_48%,transparent_62%)] holo-follow',
  },
  idolo: {
    label: 'Ídolo',
    className:
      '[--rc:#e2c37a] [--edge:#b8964a] [--rim:linear-gradient(160deg,#e9cf8a,#7d5f22_55%,#c9a75a)] [--face:radial-gradient(120%_80%_at_70%_10%,#fffaea,#f1e2b8_55%,#d9c08a)] [--ink:#4a3410] [--band:#6b4e1a] [--band-ink:#fbf1d6] [--holo:linear-gradient(115deg,transparent_30%,rgb(255_250_230/0.6)_48%,transparent_62%)] holo-follow',
  },
  lenda: {
    label: 'Lenda',
    className:
      '[--rc:#ffffff] [--edge:#ffffff] [--rim:conic-gradient(from_200deg,#ff8a8a,#ffe08a,#9dffb0,#8ad8ff,#c08aff,#ff8a8a)] [--face:linear-gradient(160deg,#f3f7ff,#e2d8ff_50%,#d4f6ec)] [--ink:#1b1f33] [--band:#1b1f33] [--band-ink:#ffffff] [--holo:linear-gradient(115deg,#ff6b6b,#ffd36b,#8bff9c,#6bd6ff,#b06bff,#ff6b6b)] holo-rainbow holo-follow',
  },
};
