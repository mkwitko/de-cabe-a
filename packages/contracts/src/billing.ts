import { z } from 'zod';

/**
 * Clube, cosmetics, Liga Pro and gifts (Stripe-hosted Checkout). Everything sold is cosmetic:
 * nothing changes scoring, hints, levels or rewards. Prices here are for display; Stripe's Price
 * (STRIPE_PRICE_<KEY> on the API) is what is charged, so keep them equal.
 */
export const ProductKey = z.enum([
  'clube_mensal',
  'clube_anual',
  'liga_pro',
  'presente_1m',
  'presente_3m',
  'presente_12m',
  'acabamento_holografico',
  'acabamento_cromado',
  'passaporte_retro',
  'passaporte_selecao',
  'torcida_charanga',
  'torcida_geral',
]);
export type ProductKey = z.infer<typeof ProductKey>;

/** A cosmetic flag the player may own: bought one by one, or lent by an active Clube. */
export const Cosmetic = z.enum([
  'acabamento_holografico',
  'acabamento_cromado',
  'passaporte_retro',
  'passaporte_selecao',
  'torcida_charanga',
  'torcida_geral',
  // Clube only
  'acabamento_clube',
  'passaporte_clube',
  'torcida_clube',
  'selo_socio',
]);
export type Cosmetic = z.infer<typeof Cosmetic>;

/** What an active Clube lends; it goes away with the Clube. */
export const CLUBE_PERKS: readonly Cosmetic[] = [
  'selo_socio',
  'acabamento_clube',
  'passaporte_clube',
  'torcida_clube',
];

type Kind = 'clube' | 'liga_pro' | 'presente' | 'cosmetico';
export type Product = {
  key: ProductKey;
  kind: Kind;
  name: string;
  /** Centavos (BRL). */
  amount: number;
  /** Subscriptions renew every month/year; the rest are paid once (card or Pix). */
  interval?: 'month' | 'year';
  /** Gift codes: months of Clube they give. */
  months?: number;
  /** Cosmetics: the flag the purchase grants. */
  grants?: Cosmetic;
  blurb: string;
};

export const CATALOG: Record<ProductKey, Product> = {
  clube_mensal: {
    key: 'clube_mensal',
    kind: 'clube',
    name: 'Clube mensal',
    amount: 990,
    interval: 'month',
    blurb: 'Renova todo mês. Cancele quando quiser.',
  },
  clube_anual: {
    key: 'clube_anual',
    kind: 'clube',
    name: 'Clube anual',
    amount: 7990,
    interval: 'year',
    blurb: 'Doze meses pelo preço de oito.',
  },
  liga_pro: {
    key: 'liga_pro',
    kind: 'liga_pro',
    name: 'Liga Pro',
    amount: 1490,
    interval: 'month',
    blurb: 'Para o dono da liga. Por liga, todo mês.',
  },
  presente_1m: {
    key: 'presente_1m',
    kind: 'presente',
    name: '1 mês de Clube',
    amount: 990,
    months: 1,
    blurb: 'Um código para quem você quiser.',
  },
  presente_3m: {
    key: 'presente_3m',
    kind: 'presente',
    name: '3 meses de Clube',
    amount: 2970,
    months: 3,
    blurb: 'Uma temporada inteira de presente.',
  },
  presente_12m: {
    key: 'presente_12m',
    kind: 'presente',
    name: '1 ano de Clube',
    amount: 7990,
    months: 12,
    blurb: 'O presente de quem conhece o amigo.',
  },
  acabamento_holografico: {
    key: 'acabamento_holografico',
    kind: 'cosmetico',
    name: 'Acabamento holográfico',
    amount: 490,
    grants: 'acabamento_holografico',
    blurb: 'Brilho de arco-íris nas figurinhas.',
  },
  acabamento_cromado: {
    key: 'acabamento_cromado',
    kind: 'cosmetico',
    name: 'Acabamento cromado',
    amount: 490,
    grants: 'acabamento_cromado',
    blurb: 'Moldura de metal nas figurinhas.',
  },
  passaporte_retro: {
    key: 'passaporte_retro',
    kind: 'cosmetico',
    name: 'Passaporte Retrô',
    amount: 690,
    grants: 'passaporte_retro',
    blurb: 'Capa de couro gasto, carimbos antigos.',
  },
  passaporte_selecao: {
    key: 'passaporte_selecao',
    kind: 'cosmetico',
    name: 'Passaporte Seleção',
    amount: 690,
    grants: 'passaporte_selecao',
    blurb: 'Capa verde e amarela.',
  },
  torcida_charanga: {
    key: 'torcida_charanga',
    kind: 'cosmetico',
    name: 'Torcida: Charanga',
    amount: 290,
    grants: 'torcida_charanga',
    blurb: 'Metais e bumbo a cada acerto.',
  },
  torcida_geral: {
    key: 'torcida_geral',
    kind: 'cosmetico',
    name: 'Torcida: Geral',
    amount: 290,
    grants: 'torcida_geral',
    blurb: 'Arquibancada cheia a cada acerto.',
  },
};

/** POST /v1/billing/checkout; `leagueCode` only for liga_pro (the league's owner pays). */
export const CheckoutRequest = z.strictObject({
  product: ProductKey,
  leagueCode: z.string().length(6).optional(),
});
export type CheckoutRequest = z.infer<typeof CheckoutRequest>;
/** The Stripe-hosted page to send the browser to. */
export const RedirectResponse = z.strictObject({ url: z.string() });
export type RedirectResponse = z.infer<typeof RedirectResponse>;

export const GiftCode = z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
export const RedeemRequest = z.strictObject({ code: GiftCode });
export type RedeemRequest = z.infer<typeof RedeemRequest>;

export const EntitlementsResponse = z.strictObject({
  clube: z.strictObject({
    active: z.boolean(),
    /** Last day covered (subscription period end or gift end), ISO; null when not a member. */
    until: z.string().nullable(),
    /** The subscription ends at `until` (cancelled in the portal) instead of renewing. */
    endsAtPeriodEnd: z.boolean(),
    /** Has a Stripe subscription (the portal can manage it). */
    subscribed: z.boolean(),
  }),
  cosmetics: z.array(Cosmetic),
  /** Codes bought by this account, to share. */
  gifts: z.array(
    z.strictObject({
      code: GiftCode,
      months: z.number().int(),
      redeemed: z.boolean(),
    }),
  ),
  /** Purchases still waiting for Pix. */
  pending: z.array(ProductKey),
  leaguesPro: z.array(z.strictObject({ code: z.string(), until: z.string().nullable() })),
});
export type EntitlementsResponse = z.infer<typeof EntitlementsResponse>;
