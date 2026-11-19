/**
 * Image rights (direito de imagem). Lei Pelé (Lei 9.615/1998) art. 87-A, added by Lei
 * 12.395/2011, lets a club pay part of a player's pay as a civil image-rights contract, usually
 * with his own company; its single paragraph, by Lei 13.155/2015, caps that part at 40% of his
 * total remuneration. That part carries no payroll charges (INSS patronal ~20%, FGTS 8%) and the
 * company is taxed below the 27.5% IRPF (Lei 11.196/2005 art. 129), so the same cost buys more
 * net pay. The risk: when the share is a disguised wage the labour courts reclassify it (TRT-3
 * and others) and the club pays back charges plus a fine, often years later (Receita's multa
 * de ofício, 75%: Lei 9.430/1996 art. 44).
 * Sources: planalto.gov.br/ccivil_03/leis/l9615consol.htm; migalhas.com.br/depeso/241868;
 * portal.trt3.jus.br (natureza salarial de parcela paga como direito de imagem).
 * Integers and × ÷ only; every number is a PARÂMETRO and every draw comes from seed + season.
 */
import { pick, rngFrom } from '@decabeca/match-engine';
import type { CareerWorld } from '../career/advance';
import { seedOf } from '../competition/season';
import { postEntry } from '../finance/ledger';
import { note } from '../career/inbox';
import type { PackPlayer } from '../pack/schema';

/** The law's cap: image rights are at most this % of his total pay. */
export const IMAGE_MAX = 40;
/** The share the person's club uses unless they choose another: the market's, up to this. */
export const IMAGE_SAFE = 30;
/**
 * Above this share a claim can come, likelier the larger the share: the larger it is, the more it
 * looks like a disguised wage. No share is free of it, so the saving is a bet, not a gift.
 * PARÂMETRO.
 */
const RISK_FROM = 10;
/** Charges on payroll the club skips on the image share: INSS patronal 20% + FGTS 8%. */
const CHARGES = 28;
/** The same saving as a % of the pay's total cost to the club: 28 / 128. */
const SAVED = 22;
/** Years of back charges a claim reaches (limitation is 5; courts rarely go so far). PARÂMETRO. */
const YEARS_BACK = 3;
/** Fine over the back charges, %. */
const FINE = 75;
/** Chance per season of a claim, % for every 20 points of share above `RISK_FROM`: 6% at 30%. */
const CLAIM = 6;
/** Extra chance when the player left on bad terms (he walked out over arrears), %. PARÂMETRO. */
const GRUDGE = 30;

/** An image-rights contract the person signed (kept until the claim window passes). */
export interface ImageDeal {
  /** The club that signed it: the person's club at the time. */
  club: string;
  share: number;
  /** His monthly wage then, the base of a claim. */
  wage: number;
  /** He left the club in anger (unpaid wages). */
  bad?: boolean;
}

/** Share clubs use by wage (R$/month, upper bound exclusive). PARÂMETRO, from press reports. */
const BY_WAGE: readonly [number, number][] = [
  [30_000, 0],
  [100_000, 10],
  [250_000, 20],
  [500_000, 30],
  [Infinity, 35],
];

/** The share a club uses for a wage: the market's habit. */
export function usualShare(wage: number): number {
  return BY_WAGE.find(([upTo]) => wage < upTo)![1];
}

/** The share in his contract: the person's own deal, else the usual one (never past the safe line at the person's club). */
export function imageShare(w: CareerWorld, p: PackPlayer): number {
  const deal = w.image?.[p.id];
  if (deal && deal.club === p.clubId) return deal.share;
  const usual = usualShare(p.contract?.wage ?? 0);
  return p.clubId === w.clubId ? Math.min(usual, IMAGE_SAFE) : usual;
}

/** What his wage costs the club each month: the saved charges on the image share come off. */
export const wageCost = (w: CareerWorld, p: PackPlayer): number => {
  const wage = p.contract?.wage ?? 0;
  return wage - Math.round((wage * imageShare(w, p) * SAVED) / 10_000);
};

/** Records the share the person signed (undefined: the club's usual one). */
export function setImage(w: CareerWorld, p: PackPlayer, share: number | undefined, wage: number) {
  const image = { ...w.image };
  if (share === undefined) delete image[p.id];
  else image[p.id] = { club: w.clubId, share, wage };
  if (Object.keys(image).length) w.image = image;
  else delete w.image;
}

/** A player walked out on the club: he will not forget it. */
export function flagGrudge(w: CareerWorld, p: PackPlayer) {
  const deal = w.image?.[p.id];
  if (deal) w.image = { ...w.image, [p.id]: { ...deal, bad: true } };
}

/**
 * At the season's turn each deal above the safe line may bring a labour claim: back charges on
 * the share for `YEARS_BACK` years plus the fine, paid at once, with a note. Deals of players
 * who have left are tried once and dropped.
 */
export function settleImageClaims(w: CareerWorld): void {
  const season = w.season.season;
  const kept: Record<string, ImageDeal> = {};
  // The person's deals, and the usual share of everyone else in the squad.
  const deals: Record<string, ImageDeal> = { ...w.image };
  for (const p of w.pack.players)
    if (p.clubId === w.clubId && !deals[p.id])
      deals[p.id] = { club: w.clubId, share: imageShare(w, p), wage: p.contract?.wage ?? 0 };
  for (const [id, d] of Object.entries(deals).sort(([a], [b]) => (a < b ? -1 : 1))) {
    const p = w.pack.players.find((x) => x.id === id);
    if (d.club === w.clubId && d.share > RISK_FROM) {
      const chance = Math.round(((d.share - RISK_FROM) * CLAIM) / 20) + (d.bad ? GRUDGE : 0);
      if (pick(rngFrom(seedOf(w.seed, `image:${season}:${id}`)), 100) < chance) {
        const back = Math.round((d.wage * d.share * CHARGES * 12 * YEARS_BACK) / 10_000);
        const amount = Math.round((back * (100 + FINE)) / 100);
        postEntry(w.ledger, {
          key: `lawsuit:${season}:${id}`,
          kind: 'lawsuit',
          ref: `season:${season}`,
          amount: -amount,
          day: w.ledger.today,
          dueDay: w.ledger.today,
        });
        note(w, { day: w.day, kind: 'imageClaim', player: p?.knownAs ?? p?.name ?? id, amount });
      }
    }
    if (p && p.clubId === w.clubId && w.image?.[id]) kept[id] = d;
  }
  if (Object.keys(kept).length) w.image = kept;
  else delete w.image;
}
